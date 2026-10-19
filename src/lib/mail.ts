import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";

/**
 * Отправка почты через обычный SMTP (у Лизы — Gmail с паролем приложения).
 *
 * Реквизиты берутся ТОЛЬКО из окружения (`/srv/studio/app/.env` на сервере),
 * в репозитории их нет. Если переменные не заданы — почта просто выключена:
 * ни одно действие пользователя из-за этого падать не должно.
 */

/** Имя отправителя, пока ящик lizaandreenko не заведён. Адрес — SMTP_USER. */
const DEFAULT_FROM_NAME = "Студия художественной прозы";

/**
 * Отправитель письма. Секретов здесь нет.
 *
 * MAIL_FROM целиком перекрывает имя и адрес (как было).
 * Иначе имя берётся из MAIL_FROM_NAME, адрес — из MAIL_FROM_ADDRESS,
 * а если их нет — прежние имя и SMTP_USER.
 */
export function mailFrom(): string {
  const explicit = process.env.MAIL_FROM?.trim();
  if (explicit) return explicit;
  const name = process.env.MAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME;
  const address = process.env.MAIL_FROM_ADDRESS?.trim() || process.env.SMTP_USER?.trim() || "";
  return address ? `${name} <${address}>` : name;
}

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "https://studio.lizalikiyskaya.ru").replace(/\/+$/, "");
}

let cached: Transporter | null = null;

function transporter(): MailTransport | null {
  if (transportOverride !== undefined) return transportOverride;
  if (!mailConfigured()) return null;
  if (cached) return cached;
  const port = Number(process.env.SMTP_PORT ?? 587);
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 — SMTPS, 587 — STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return cached;
}

export type MailInput = {
  to: string;
  subject: string;
  /** Готовый HTML тела письма (без обвязки — её добавляет renderEmail). */
  html: string;
  /** Текстовая версия; если не задана — соберётся из html. */
  text?: string;
  /** Код вида письма для журнала, например payment или guide. */
  type?: string;
  /** Кому адресовано, если этот человек есть в базе. */
  recipientUserId?: string | null;
};

type MailTransport = Pick<Transporter, "sendMail">;

/** Только для тестов. null — SMTP нет. undefined — смотреть окружение. */
let transportOverride: MailTransport | null | undefined;

export function setMailTransportForTests(transport: MailTransport | null | undefined) {
  transportOverride = transport;
}

function clip(value: string, max: number): string {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) : clean;
}

function errorText(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  const secret = process.env.SMTP_PASSWORD;
  if (secret) message = message.split(secret).join("***");
  return clip(message, 500);
}

/** Журнал не должен ронять отправку: если таблица ещё не создана, письмо всё равно пытаемся отправить. */
async function recordEmailAttempt(input: MailInput, status: "sent" | "failed", error: string | null) {
  try {
    await prisma.emailLog.create({
      data: {
        type: clip(input.type?.trim() || "письмо", 40),
        recipientUserId: input.recipientUserId || null,
        recipientEmail: clip(input.to, 200),
        subject: clip(input.subject, 300),
        status,
        error,
        html: input.html.slice(0, 80_000),
      },
    });
  } catch (logError) {
    console.error("[mail] журнал не записан:", input.subject, "→", input.to, logError);
  }
}

/**
 * Никогда не бросает исключение: письмо — побочный эффект, из-за которого
 * нельзя ронять регистрацию или сохранение текста. Возвращает, ушло ли.
 * Каждая попытка пишется в EmailLog, и удачная, и нет.
 */
export async function sendMail(input: MailInput): Promise<boolean> {
  const { to, subject, html, text } = input;
  const tx = transporter();
  if (!tx) {
    console.warn("[mail] SMTP не настроен, письмо не отправлено:", subject, "→", to);
    await recordEmailAttempt(input, "failed", "SMTP не настроен");
    return false;
  }
  const from = mailFrom();
  try {
    await tx.sendMail({
      from,
      to,
      subject,
      text: text ?? htmlToText(html),
      html,
    });
    await recordEmailAttempt(input, "sent", null);
    return true;
  } catch (error) {
    console.error("[mail] не удалось отправить письмо:", subject, "→", to, errorText(error));
    await recordEmailAttempt(input, "failed", errorText(error));
    return false;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

/** Запасной текст, если письмо собрали без отдельной текстовой версии. */
function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<a [^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
  ).trim();
}

export function htmlToPlain(fragment: string): string {
  return htmlToText(fragment);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Единая обвязка письма в палитре «Солнечная».
 * Только таблицы и инлайн-стили: почтовые клиенты режут внешний CSS.
 * Onest и Literata указаны первыми в стеке — если шрифта нет у получателя,
 * письмо остаётся на Segoe UI / Helvetica / Georgia.
 */
const FONT_UI = "Onest,'Segoe UI',Helvetica,Arial,sans-serif";
const FONT_SERIF = "Literata,Georgia,'Times New Roman',serif";

/** Ключевое слово заголовка письма — на жёлтом маркере, как на сайте. */
function markedEmailTitle(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const mark = (word: string) =>
    `<span style="background:#FFD43B;padding:0 0.08em;">${escapeHtml(word)}</span>`;
  if (words.length === 1) return mark(words[0]);
  const last = words[words.length - 1];
  return `${words.slice(0, -1).map((word) => escapeHtml(word)).join(" ")} ${mark(last)}`;
}

export const EMAIL_BRAND = "Андреенко · студия художественной прозы";
export const EMAIL_SIGNATURE = "Лиза Андреенко";

export type RenderedEmail = { html: string; text: string };

export function renderEmail(options: {
  title: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
  /** Подпись в конце. Письмам ученику — «Лиза Андреенко». */
  signature?: string;
}): RenderedEmail {
  const { title, paragraphs, action, footnote, signature } = options;
  const titleHtml = markedEmailTitle(title);
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-family:${FONT_UI};font-size:16px;line-height:1.55;color:#202020;">${p}</p>`
    )
    .join("");
  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
         <tr>
           <td align="center" bgcolor="#FFD43B" style="border-radius:999px;background:#FFD43B;">
             <a href="${action.url}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#FFD43B;color:#202020;text-decoration:none;font-family:${FONT_UI};font-size:15px;font-weight:600;line-height:1;">${escapeHtml(
               action.label
             )}</a>
           </td>
         </tr>
       </table>
       <p style="margin:12px 0 0;font-family:${FONT_UI};font-size:12.5px;line-height:1.5;color:#8A8A8A;">Если кнопка не работает, скопируйте ссылку:<br><a href="${action.url}" style="color:#4B3FC0;text-decoration:underline;">${action.url}</a></p>`
    : "";
  const sign = signature
    ? `<p style="margin:28px 0 0;font-family:${FONT_SERIF};font-size:18px;font-style:italic;line-height:1.3;color:#202020;">${escapeHtml(signature)}</p>`
    : "";
  const foot = footnote
    ? `<p style="margin:22px 0 0;font-family:${FONT_UI};font-size:12.5px;line-height:1.5;color:#8A8A8A;">${footnote}</p>`
    : "";

  const logo = `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td valign="top" style="font-family:${FONT_UI};font-size:28px;font-weight:700;letter-spacing:-0.03em;line-height:1;color:#202020;">Андреенко</td>
      <td valign="top" style="padding:2px 0 0 8px;line-height:0;font-size:0;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td width="10" height="14" bgcolor="#FFD43B" style="width:10px;height:14px;background:#FFD43B;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="font-size:0;line-height:0;">
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #FFD43B;font-size:0;line-height:0;"></div>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
  <div style="margin:10px 0 0;font-family:${FONT_SERIF};font-size:16px;font-style:italic;line-height:1.3;color:#6553E8;">студия художественной прозы</div>`;

  const host = escapeHtml(appUrl().replace(/^https?:\/\//, ""));
  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F6F1E8;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(EMAIL_BRAND)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F6F1E8;">
    <tr>
      <td align="center" style="padding:28px 16px 36px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="width:100%;max-width:560px;background:#ffffff;border-radius:24px;">
          <tr>
            <td style="padding:28px 32px 18px;border-bottom:1px solid #E8E1DC;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px;">
              <h1 style="margin:0 0 18px;font-family:${FONT_UI};font-size:30px;line-height:1.15;font-weight:650;letter-spacing:-0.03em;color:#202020;">${titleHtml}</h1>
              ${body}
              ${button}
              ${sign}
              ${foot}
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="width:100%;max-width:560px;">
          <tr>
            <td align="center" style="padding:18px 8px 0;font-family:${FONT_UI};font-size:12px;line-height:1.5;color:#8A8A8A;">
              ${escapeHtml(EMAIL_BRAND)}<br>${host}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [EMAIL_BRAND, "", title, "", ...paragraphs.map((paragraph) => htmlToPlain(paragraph)), ""];
  if (action) textLines.push(`${action.label}: ${action.url}`, "");
  if (signature) textLines.push(signature, "");
  if (footnote) textLines.push(htmlToPlain(footnote), "");
  textLines.push(appUrl());

  return { html, text: textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}
