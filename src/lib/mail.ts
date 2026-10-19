import nodemailer, { type Transporter } from "nodemailer";

/**
 * Отправка почты через обычный SMTP (у Лизы — Gmail с паролем приложения).
 *
 * Реквизиты берутся ТОЛЬКО из окружения (`/srv/studio/app/.env` на сервере),
 * в репозитории их нет. Если переменные не заданы — почта просто выключена:
 * ни одно действие пользователя из-за этого падать не должно.
 */

const FROM_NAME = "Студия художественной прозы";

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "https://studio.lizalikiyskaya.ru").replace(/\/+$/, "");
}

let cached: Transporter | null = null;

function transporter(): Transporter | null {
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
};

/**
 * Никогда не бросает исключение: письмо — побочный эффект, из-за которого
 * нельзя ронять регистрацию или сохранение текста. Возвращает, ушло ли.
 */
export async function sendMail({ to, subject, html, text }: MailInput): Promise<boolean> {
  const tx = transporter();
  if (!tx) {
    console.warn("[mail] SMTP не настроен, письмо не отправлено:", subject, "→", to);
    return false;
  }
  const from = process.env.MAIL_FROM ?? `${FROM_NAME} <${process.env.SMTP_USER}>`;
  try {
    await tx.sendMail({
      from,
      to,
      subject,
      text: text ?? htmlToText(html),
      html,
    });
    return true;
  } catch (error) {
    console.error("[mail] не удалось отправить письмо:", subject, "→", to, error);
    return false;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

export function renderEmail(options: {
  title: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
}): string {
  const { title, paragraphs, action, footnote } = options;
  const body = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-family:${FONT_UI};font-size:15.5px;line-height:1.55;color:#555555">${p}</p>`
    )
    .join("");
  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 0">
         <tr>
           <td align="center" bgcolor="#FFD43B" style="border-radius:999px;background:#FFD43B;">
             <a href="${action.url}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#FFD43B;color:#202020;text-decoration:none;font-family:${FONT_UI};font-size:16px;font-weight:600;line-height:1">${escapeHtml(
               action.label
             )}</a>
           </td>
         </tr>
       </table>
       <p style="margin:14px 0 0;font-family:${FONT_UI};font-size:12.5px;line-height:1.5;color:#8A8A8A">Если кнопка не работает, скопируйте ссылку:<br><a href="${action.url}" style="color:#7B6CF6;text-decoration:underline">${action.url}</a></p>`
    : "";
  const foot = footnote
    ? `<p style="margin:24px 0 0;font-family:${FONT_UI};font-size:12.5px;line-height:1.5;color:#8A8A8A">${footnote}</p>`
    : "";

  const logo = `<table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="font-family:${FONT_UI};font-size:28px;font-weight:700;letter-spacing:-0.02em;line-height:1;color:#202020;padding:0 0 2px;">Закладка</td>
    </tr>
    <tr>
      <td style="padding:0 0 0 6px;line-height:0;font-size:0;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td width="11" height="12" bgcolor="#FFD43B" style="width:11px;height:12px;background:#FFD43B;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td align="center" style="font-size:0;line-height:0;">
            <div style="width:0;height:0;border-left:6px solid transparent;border-right:5px solid transparent;border-top:8px solid #FFD43B;font-size:0;line-height:0;"></div>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>`;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="width:100%;max-width:560px;background:#ffffff;">
          <tr>
            <td style="padding:8px 8px 0;border-bottom:1px solid #ECECEC;">
              ${logo}
              <div style="margin:14px 0 18px;font-family:${FONT_SERIF};font-size:16px;font-style:italic;line-height:1.3;color:#6553E8;">Студия художественной прозы</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 8px 0;">
              <h1 style="margin:0 0 16px;font-family:${FONT_UI};font-size:28px;line-height:1.15;font-weight:650;letter-spacing:-0.02em;color:#202020;">${escapeHtml(title)}</h1>
              ${body}
              ${button}
              ${foot}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 8px 0;font-family:${FONT_UI};font-size:12px;line-height:1.5;color:#8A8A8A;">
              Письмо отправлено платформой ${escapeHtml(appUrl().replace(/^https?:\/\//, ""))}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
