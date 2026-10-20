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

/** Пустые поля настройки не трогают адрес из окружения. */
export function envelopeFrom(
  sender: MailSenderInput | null,
  envFrom: string,
): { from: string; replyTo?: string } {
  const parsed = parseAddress(envFrom);
  const name = sender?.fromName.trim() || parsed.name;
  const email = sender?.fromEmail.trim() || parsed.email;
  const from = email ? `${name} <${email}>` : name || envFrom;
  const replyTo = sender?.replyTo.trim() || undefined;
  return { from, replyTo };
}

/**
 * Честно: приложение не может проверить ящик у провайдера, не отправив письмо.
 * Gmail принимает «От» только если это SMTP_USER или алиас «Отправлять почту как».
 */
export function senderWarning(sender: MailSenderInput, smtp: SmtpPublic): string | null {
  if (!smtp.configured) {
    return "SMTP не настроен. Письма не уйдут, пока на сервере не заданы SMTP_HOST, SMTP_USER и SMTP_PASSWORD. Пароль в базу не пишется.";
  }
  const from = sender.fromEmail.trim().toLowerCase();
  if (!from) return null;
  const host = smtp.host.toLowerCase();
  const user = smtp.user.trim().toLowerCase();
  const gmail = host.includes("gmail") || host.includes("google");
  if (from === user) return null;
  if (gmail) {
    return `Сервер входит в Gmail как ${smtp.user}. Чужой адрес в поле «От» Gmail отклонит, пока этот ящик не добавлен в Gmail: Настройки, Аккаунты и импорт, Отправлять почту как. Пароль приложения остаётся в SMTP_PASSWORD на сервере.`;
  }
  return `Сервер входит как ${smtp.user || "ящик из SMTP_USER"} на ${smtp.host}. Адрес «От» должен быть разрешён этим ящиком, иначе сервер отклонит письмо. Пароль в базу не пишется.`;
}

export function senderSetupNotes(smtp: SmtpPublic): string[] {
  const host = smtp.host.toLowerCase();
  const gmail = host.includes("gmail") || host.includes("google");
  if (!smtp.configured) {
    return [
      "В /srv/studio/app/.env нужны SMTP_HOST, SMTP_PORT, SMTP_USER и SMTP_PASSWORD.",
      "Для Gmail это smtp.gmail.com, порт 587 и пароль приложения Google, не обычный пароль.",
      "Пароль в базу и в эту форму не кладётся.",
    ];
  }
  if (gmail) {
    return [
      `Сейчас вход в почту: ${smtp.user}. Это не секрет, это ящик SMTP_USER.`,
      "Сменить адрес «От» на другой можно, только если он добавлен в Gmail как «Отправлять почту как» и подтверждён.",
      "Свой домен: в DNS запись SPF, которая разрешает Gmail, и алиас в Gmail. DKIM Gmail настраивается там же.",
      "Reply-To можно поставить любой. На вход в SMTP он не влияет.",
      "Пароль приложения меняется только в .env, не здесь.",
    ];
  }
  return [
    `Сейчас вход: ${smtp.user} через ${smtp.host}.`,
    "Адрес «От» должен принадлежать этому ящику или домену, который провайдер уже подтвердил.",
    "Для своего домена у провайдера обычно нужны SPF и DKIM. Точные записи даёт сам почтовый сервис.",
    "Reply-To можно поставить любой.",
    "Пароль SMTP в эту форму не вводится и в базу не пишется.",
  ];
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
