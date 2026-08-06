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
 * Единая обвязка письма: шапка студии, текст, необязательная кнопка.
 * Верстка нарочно простая и табличная — почтовые клиенты не любят
 * современный CSS.
 */
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
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#2b2724">${p}</p>`
    )
    .join("");
  const button = action
    ? `<p style="margin:22px 0 0">
         <a href="${action.url}" style="display:inline-block;padding:11px 22px;border-radius:999px;background:#6e2230;color:#ffffff;text-decoration:none;font-size:14px">${escapeHtml(
           action.label
         )}</a>
       </p>
       <p style="margin:12px 0 0;font-size:12px;color:#8a827c">Если кнопка не работает, скопируйте ссылку: ${action.url}</p>`
    : "";
  const foot = footnote
    ? `<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#8a827c">${footnote}</p>`
    : "";

  return `<!doctype html>
<html lang="ru"><body style="margin:0;padding:24px;background:#f6f3f0;font-family:Georgia,'Times New Roman',serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e0da">
    <tr><td style="padding:26px 28px 0">
      <div style="font-size:15px;font-weight:600;color:#2b2724">Студия художественной прозы</div>
      <div style="font-size:12.5px;font-style:italic;color:#8a827c">Лизы Ликийской</div>
      <hr style="border:none;border-top:1px solid #e6e0da;margin:16px 0 20px">
      <h1 style="margin:0 0 16px;font-size:19px;font-weight:600;color:#2b2724">${escapeHtml(title)}</h1>
    </td></tr>
    <tr><td style="padding:0 28px 28px">
      ${body}
      ${button}
      ${foot}
    </td></tr>
  </table>
  <p style="max-width:560px;margin:14px auto 0;font-size:11.5px;color:#a29a94;text-align:center">
    Письмо отправлено платформой ${escapeHtml(appUrl().replace(/^https?:\/\//, ""))}
  </p>
</body></html>`;
}
