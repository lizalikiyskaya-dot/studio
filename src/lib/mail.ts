import { resolve4 } from "node:dns/promises";
import net from "node:net";
import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/prisma";
import { envelopeFrom, readStoredSender } from "@/lib/mailSender";

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
  return (process.env.APP_URL ?? "https://studio.lizandwriter.ru").replace(/\/+$/, "");
}

let cached: MailTransport | null = null;
let opening: Promise<MailTransport | null> | null = null;

/**
 * Куда стучаться в SMTP. Nodemailer сам выбирает случайный адрес из A и AAAA.
 * У сервера нет маршрута IPv6, поэтому берём только A и оставляем имя для TLS.
 */
export function pickIpv4SmtpHost(hostname: string, addresses: string[]): { host: string; servername?: string } {
  const name = hostname.trim();
  if (!name || net.isIP(name)) return { host: name };
  const ipv4 = addresses.find((item) => net.isIPv4(item));
  if (!ipv4) return { host: name };
  return { host: ipv4, servername: name };
}

async function resolveIpv4Smtp(hostname: string): Promise<{ host: string; servername?: string }> {
  const name = hostname.trim();
  if (!name || net.isIP(name)) return { host: name };
  try {
    return pickIpv4SmtpHost(name, await resolve4(name));
  } catch {
    return { host: name };
  }
}

async function transporter(): Promise<MailTransport | null> {
  if (transportOverride !== undefined) return transportOverride;
  if (!sourceOverride && !mailConfigured()) return null;
  if (cached) return cached;
  if (!opening) {
    opening = openTransport().finally(() => {
      opening = null;
    });
  }
  return opening;
}

function dropCachedTransport() {
  const stale = cached as (MailTransport & { close?: () => void }) | null;
  cached = null;
  opening = null;
  try {
    stale?.close?.();
  } catch {
    // Мёртвый сокет не должен мешать новой попытке.
  }
}

async function openTransport(): Promise<MailTransport | null> {
  if (sourceOverride) {
    const transport = await sourceOverride();
    cached = transport;
    return transport;
  }
  const name = process.env.SMTP_HOST?.trim() || "";
  const port = Number(process.env.SMTP_PORT ?? 587);
  const picked = await resolveIpv4Smtp(name);
  const transport = nodemailer.createTransport({
    host: picked.host,
    port,
    // 465 — SMTPS, 587 — STARTTLS. Имя хоста нужно для проверки сертификата, когда host уже IPv4.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    tls: picked.servername ? { servername: picked.servername } : undefined,
  });
  cached = transport;
  return transport;
}

/** Обрыв и таймаут соединения. Отказ сервера из-за адреса получателя сюда не входит. */
export function isRetryableMailError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code = String((error as { code?: string }).code ?? "").toLowerCase();
  const responseCode = (error as { responseCode?: number }).responseCode;
  if (typeof responseCode === "number" && responseCode >= 400 && responseCode < 500) return false;
  return /timeout|etimedout|econnreset|econnrefused|econnection|esocket|ehostunreach|enetunreach|epipe|socket hang up|connection closed|greeting never received/.test(
    `${code} ${message}`,
  );
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
  /** Если задан, не читаем настройку наставника ещё раз. */
  from?: string;
  replyTo?: string;
  /** Ссылка отписки для заголовка List-Unsubscribe. */
  listUnsubscribe?: string;
};

type MailTransport = Pick<Transporter, "sendMail">;

/** Только для тестов. null — SMTP нет. undefined — смотреть окружение. */
let transportOverride: MailTransport | null | undefined;
let sourceOverride: (() => Promise<MailTransport | null>) | null = null;
let recordOverride: ((input: MailInput, status: "sent" | "failed", error: string | null) => Promise<void>) | null = null;

export function setMailTransportForTests(transport: MailTransport | null | undefined) {
  transportOverride = transport;
}

export function setMailTransportSourceForTests(source: (() => Promise<MailTransport | null>) | null) {
  sourceOverride = source;
  dropCachedTransport();
}

export function setEmailLogForTests(
  record: ((input: MailInput, status: "sent" | "failed", error: string | null) => Promise<void>) | null,
) {
  recordOverride = record;
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
  if (recordOverride) {
    await recordOverride(input, status, error);
    return;
  }
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
/**
 * Заголовки одноразовой отписки. Ссылка в шапке ведёт на POST-адрес,
 * в письме остаётся обычная страница с тем же токеном.
 */
export function listUnsubscribeHeaders(link: string): Record<string, string> {
  let href = link.trim();
  try {
    const url = new URL(href);
    const token = url.searchParams.get("token");
    if (token) {
      const oneClick = new URL("/api/unsubscribe", url.origin);
      oneClick.searchParams.set("token", token);
      href = oneClick.toString();
    }
  } catch {
    // кривая ссылка остаётся как есть: лучше заголовок, чем тихий пропуск
  }
  return {
    "List-Unsubscribe": `<${href}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

async function dispatch(tx: MailTransport, input: MailInput, from: string, replyTo: string | undefined) {
  await tx.sendMail({
    from,
    replyTo,
    to: input.to,
    subject: input.subject,
    text: input.text ?? htmlToText(input.html),
    html: input.html,
    headers: input.listUnsubscribe ? listUnsubscribeHeaders(input.listUnsubscribe) : undefined,
  });
}

export async function sendMail(input: MailInput): Promise<boolean> {
  const { to, subject } = input;
  const tx = await transporter();
  if (!tx) {
    console.warn("[mail] SMTP не настроен, письмо не отправлено:", subject, "→", to);
    await recordEmailAttempt(input, "failed", "SMTP не настроен");
    return false;
  }
  const stored = input.from ? null : await readStoredSender();
  const envelope = input.from
    ? { from: input.from, replyTo: input.replyTo }
    : envelopeFrom(stored, mailFrom());
  try {
    await dispatch(tx, input, envelope.from, envelope.replyTo);
  } catch (error) {
    const retry = transportOverride === undefined && isRetryableMailError(error);
    if (!retry) {
      console.error("[mail] не удалось отправить письмо:", subject, "→", to, errorText(error));
      await recordEmailAttempt(input, "failed", errorText(error));
      return false;
    }
    dropCachedTransport();
    console.error("[mail] соединение оборвалось, повторяю один раз:", subject, "→", to, errorText(error));
    const fresh = await transporter();
    if (!fresh || fresh === tx) {
      await recordEmailAttempt(input, "failed", errorText(error));
      return false;
    }
    try {
      await dispatch(fresh, input, envelope.from, envelope.replyTo);
    } catch (retryError) {
      if (isRetryableMailError(retryError)) dropCachedTransport();
      console.error("[mail] не удалось отправить письмо:", subject, "→", to, errorText(retryError));
      await recordEmailAttempt(input, "failed", errorText(retryError));
      return false;
    }
  }
  await recordEmailAttempt(input, "sent", null);
  return true;
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

/** Куски дизайнерского письма. Текст простой: экранируется здесь. */
export type EmailBlock =
  | { kind: "p"; text: string }
  | { kind: "section"; title: string; items: string[]; hint?: string }
  | { kind: "card"; kicker?: string; title: string; body?: string; meta?: string[] }
  | { kind: "quote"; text: string; author: string; source?: string };

function textToHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function linkedItem(item: string): { label: string; url: string } | null {
  const cut = item.indexOf("\t");
  if (cut <= 0) return null;
  const label = item.slice(0, cut).trim();
  const url = item.slice(cut + 1).trim();
  if (!label || !/^https?:\/\//.test(url)) return null;
  return { label, url };
}

function itemHtml(item: string): string {
  const link = linkedItem(item);
  if (!link) return textToHtml(item);
  return `<a href="${escapeHtml(link.url)}" style="color:#4B3FC0;text-decoration:underline;">${escapeHtml(link.label)}</a>`;
}

function bulletTable(items: string[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">${items
    .map(
      (item) => `<tr>
        <td valign="top" width="16" style="width:16px;padding:0 0 8px;font-family:${FONT_UI};font-size:16px;line-height:1.45;color:#202020;">•</td>
        <td valign="top" style="padding:0 0 8px;font-family:${FONT_UI};font-size:15px;line-height:1.45;color:#202020;">${itemHtml(item)}</td>
      </tr>`
    )
    .join("")}</table>`;
}

function hintLine(hint: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 0;">
    <tr>
      <td width="4" bgcolor="#FFD43B" style="width:4px;background:#FFD43B;font-size:0;line-height:0;">&nbsp;</td>
      <td style="padding:0 0 0 10px;font-family:${FONT_UI};font-size:14px;line-height:1.45;color:#202020;">${textToHtml(hint)}</td>
    </tr>
  </table>`;
}

function blockHtml(block: EmailBlock): string {
  if (block.kind === "p") {
    return `<p style="margin:0 0 14px;font-family:${FONT_UI};font-size:16px;line-height:1.55;color:#202020;">${textToHtml(block.text)}</p>`;
  }
  if (block.kind === "section") {
    const hint = block.hint ? hintLine(block.hint) : "";
    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 12px;background:#F6F1E8;border-radius:14px;">
      <tr>
        <td bgcolor="#F6F1E8" style="padding:16px 16px 12px;background:#F6F1E8;border-radius:14px;">
          <h2 style="margin:0 0 10px;font-family:${FONT_UI};font-size:18px;line-height:1.25;font-weight:700;color:#202020;">${escapeHtml(block.title)}</h2>
          ${bulletTable(block.items)}
          ${hint}
        </td>
      </tr>
    </table>`;
  }
  if (block.kind === "card") {
    const kicker = block.kicker
      ? `<p style="margin:0 0 6px;font-family:${FONT_SERIF};font-size:15px;font-style:italic;line-height:1.3;color:#6553E8;">${textToHtml(block.kicker)}</p>`
      : "";
    const body = block.body
      ? `<p style="margin:12px 0 0;font-family:${FONT_SERIF};font-size:17px;line-height:1.5;color:#202020;">${textToHtml(block.body)}</p>`
      : "";
    const meta = (block.meta ?? [])
      .map(
        (line) =>
          `<p style="margin:8px 0 0;font-family:${FONT_UI};font-size:13.5px;line-height:1.4;color:#8A8A8A;">${textToHtml(line)}</p>`
      )
      .join("");
    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;background:#F6F1E8;border-radius:16px;">
      <tr>
        <td bgcolor="#F6F1E8" style="padding:18px 18px 16px;background:#F6F1E8;border-radius:16px;">
          ${kicker}
          <h2 style="margin:0;font-family:${FONT_UI};font-size:22px;line-height:1.25;font-weight:700;color:#202020;">${textToHtml(block.title)}</h2>
          ${body}
          ${meta}
        </td>
      </tr>
    </table>`;
  }
  const source = block.source
    ? `<p style="margin:4px 0 0;font-family:${FONT_UI};font-size:13px;line-height:1.4;color:#8A8A8A;">${textToHtml(block.source)}</p>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;background:#F6F1E8;border-radius:16px;">
    <tr>
      <td bgcolor="#F6F1E8" style="padding:22px 20px 20px;background:#F6F1E8;border-radius:16px;">
        <p style="margin:0;font-family:${FONT_SERIF};font-size:26px;font-style:italic;line-height:1.35;color:#202020;">«${textToHtml(block.text)}»</p>
        <p style="margin:16px 0 0;font-family:${FONT_SERIF};font-size:16px;font-style:italic;line-height:1.3;color:#6553E8;">${textToHtml(block.author)}</p>
        ${source}
      </td>
    </tr>
  </table>`;
}

function blockPlain(block: EmailBlock): string[] {
  if (block.kind === "p") return [block.text];
  if (block.kind === "section") {
    return [
      block.title,
      ...block.items.map((item) => {
        const link = linkedItem(item);
        return link ? `• ${link.label}: ${link.url}` : `• ${item}`;
      }),
      ...(block.hint ? [block.hint] : []),
    ];
  }
  if (block.kind === "card") {
    return [block.kicker, block.title, block.body, ...(block.meta ?? [])].filter((line): line is string => Boolean(line));
  }
  return [`«${block.text}»`, block.author, block.source].filter((line): line is string => Boolean(line));
}

export function renderEmail(options: {
  title: string;
  paragraphs?: string[];
  blocks?: EmailBlock[];
  action?: { label: string; url: string };
  footnote?: string;
  /** Подпись в конце. Письмам ученику — «Лиза Андреенко». */
  signature?: string;
  /** Адрес в подвале и в текстовой версии. Пусто: APP_URL или его запасной адрес. */
  siteUrl?: string;
}): RenderedEmail {
  const { title, paragraphs = [], blocks, action, footnote, signature } = options;
  const home = (options.siteUrl?.trim() || appUrl()).replace(/\/+$/, "");
  const titleHtml = markedEmailTitle(title);
  const body =
    blocks && blocks.length > 0
      ? blocks.map((block) => blockHtml(block)).join("")
      : paragraphs
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

  const host = escapeHtml(home.replace(/^https?:\/\//, ""));
  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Literata:ital@0;1&family=Onest:wght@400;600;700&display=swap">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F6F1E8;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(EMAIL_BRAND)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F6F1E8;">
    <tr>
      <td align="center" style="padding:28px 16px 36px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:24px;">
          <tr>
            <td height="8" bgcolor="#FFD43B" style="height:8px;background:#FFD43B;font-size:0;line-height:0;border-radius:24px 24px 0 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:22px 24px 16px;border-bottom:1px solid #E8E1DC;">
              ${logo}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 28px;">
              <h1 style="margin:0 0 18px;font-family:${FONT_UI};font-size:30px;line-height:1.15;font-weight:650;letter-spacing:-0.03em;color:#202020;">${titleHtml}</h1>
              ${body}
              ${button}
              ${sign}
              ${foot}
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;">
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

  const contentLines =
    blocks && blocks.length > 0 ? blocks.flatMap((block) => blockPlain(block)) : paragraphs.map((paragraph) => htmlToPlain(paragraph));
  const textLines = [EMAIL_BRAND, "", title, "", ...contentLines, ""];
  if (action) textLines.push(`${action.label}: ${action.url}`, "");
  if (signature) textLines.push(signature, "");
  if (footnote) textLines.push(htmlToPlain(footnote), "");
  textLines.push(home);

  return { html, text: textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}

/**
 * То же фирменное письмо, без факторов, из-за которых почта чаще попадает в спам:
 * без загрузки шрифтов, скрытая строка — первое предложение, не марка.
 */
export function withoutWebFonts(letter: RenderedEmail, preview: string): RenderedEmail {
  const html = letter.html
    .replace(/\n?\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, "")
    .replaceAll(FONT_UI, "'Segoe UI',Helvetica,Arial,sans-serif")
    .replaceAll(FONT_SERIF, "Georgia,'Times New Roman',serif")
    .replace(
      `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(EMAIL_BRAND)}</div>`,
      `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preview)}</div>`,
    );
  return { html, text: letter.text };
}
