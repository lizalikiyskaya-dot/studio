import { prisma } from "@/lib/prisma";

/** Имя, адрес «От» и Reply-To. Пароля здесь нет. */
export type MailSenderInput = {
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

export type SmtpPublic = {
  host: string;
  user: string;
  configured: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptySender(): MailSenderInput {
  return { fromName: "", fromEmail: "", replyTo: "" };
}

export function smtpPublicFromEnv(env: NodeJS.ProcessEnv = process.env): SmtpPublic {
  const host = env.SMTP_HOST?.trim() ?? "";
  const user = env.SMTP_USER?.trim() ?? "";
  const password = env.SMTP_PASSWORD?.trim() ?? "";
  return { host, user, configured: Boolean(host && user && password) };
}

export function normalizeSender(input: MailSenderInput): { value: MailSenderInput; error?: string } {
  const fromName = input.fromName.trim().slice(0, 80);
  const fromEmail = input.fromEmail.trim().toLowerCase().slice(0, 200);
  const replyTo = input.replyTo.trim().toLowerCase().slice(0, 200);
  if (fromEmail && !EMAIL_RE.test(fromEmail)) {
    return { value: { fromName, fromEmail, replyTo }, error: "Адрес отправителя похож на ошибку." };
  }
  if (replyTo && !EMAIL_RE.test(replyTo)) {
    return { value: { fromName, fromEmail, replyTo }, error: "Адрес для ответа похож на ошибку." };
  }
  return { value: { fromName, fromEmail, replyTo } };
}

export function parseAddress(value: string): { name: string; email: string } {
  const match = /^(.*)<([^>]+)>\s*$/.exec(value.trim());
  if (!match) return { name: value.trim(), email: "" };
  return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].trim() };
}

/**
 * Рабочий адрес всегда из окружения (`MAIL_FROM` / `SMTP_USER`).
 * Сохранённые имя, «От» и Reply-To в профиле его не подменяют и отправку не ломают.
 */
export function envelopeFrom(
  _sender: MailSenderInput | null,
  envFrom: string,
): { from: string; replyTo?: string } {
  return { from: envFrom };
}

/**
 * Честно: приложение не может проверить ящик у провайдера, не отправив письмо.
 * Gmail принимает «От» только если это SMTP_USER или алиас «Отправлять почту как».
 */
export function senderWarning(sender: MailSenderInput, smtp: SmtpPublic): string | null {
  if (!smtp.configured) {
    return "SMTP не настроен, письма не уйдут.";
  }
  const from = sender.fromEmail.trim().toLowerCase();
  if (!from) return null;
  const host = smtp.host.toLowerCase();
  const user = smtp.user.trim().toLowerCase();
  const gmail = host.includes("gmail") || host.includes("google");
  if (from === user) return null;
  if (gmail) {
    return "Другой адрес «От» Gmail примет, только если он добавлен как «Отправлять почту как».";
  }
  return `Адрес «От» должен быть разрешён ящиком ${smtp.user || "SMTP_USER"}, иначе сервер его отклонит.`;
}

export async function readStoredSender(): Promise<MailSenderInput | null> {
  try {
    const mentor = await prisma.user.findFirst({
      where: { role: "MENTOR" },
      orderBy: { createdAt: "asc" },
      select: { mailFromName: true, mailFromEmail: true, mailReplyTo: true },
    });
    if (!mentor) return null;
    return {
      fromName: mentor.mailFromName,
      fromEmail: mentor.mailFromEmail,
      replyTo: mentor.mailReplyTo,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("mailFrom") || message.includes("mailReplyTo") || message.includes("P2022")) return null;
    console.error("[mail] настройки отправителя не прочитаны", error);
    return null;
  }
}
