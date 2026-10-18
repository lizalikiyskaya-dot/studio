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
       <p style="margin:14px 0 0;font-family:${FONT_UI};font-size:12.5px;line-height:1.5;color:#8A8A8A">Если кнопка не работает, скопируйте ссылку:<br><a href="${action.url}" style="color:#6553E8;text-decoration:underline">${action.url}</a></p>`
    : "";
  const foot = footnote
    ? `<p style="margin:24px 0 0;font-family:${FONT_UI};font-size:12.5px;line-height:1.5;color:#8A8A8A">${footnote}</p>`
    : "";

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
      <td align="center" style="padding:28px 16px 36px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="width:100%;max-width:560px;">
          <tr>
            <td bgcolor="#E6ECFF" style="background-color:#E6ECFF;background-image:linear-gradient(180deg,#E3F6EF,#E6ECFF);border-radius:28px;padding:28px 32px 26px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="34" height="34" align="center" valign="middle" bgcolor="#2B2D5C" style="width:34px;height:34px;background:#2B2D5C;border-radius:10px;font-family:${FONT_SERIF};font-size:18px;font-weight:600;line-height:34px;color:#FFD43B;text-align:center;">А</td>
                  <td style="padding-left:10px;font-family:${FONT_SERIF};font-size:22px;font-weight:600;letter-spacing:-0.03em;line-height:1;color:#202020;">Андреенко</td>
                </tr>
              </table>
              <div style="margin-top:16px;font-family:${FONT_SERIF};font-size:22px;line-height:1.25;color:#202020;">Студия художественной прозы</div>
            </td>
          </tr>
          <tr><td style="height:22px;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:4px 8px 0;">
              <h1 style="margin:0 0 16px;font-family:${FONT_UI};font-size:28px;line-height:1.15;font-weight:600;letter-spacing:-0.025em;color:#202020;">${escapeHtml(title)}</h1>
              ${body}
              ${button}
              ${foot}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 8px 0;font-family:${FONT_UI};font-size:12px;line-height:1.5;color:#8A8A8A;">
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
