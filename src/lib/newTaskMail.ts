import { addressForm, greetingName, usesFormalAddress } from "@/lib/addressForm";
import { mailGate } from "@/lib/activityDigest";
import { EMAIL_SIGNATURE, appUrl, escapeHtml, mailFrom, renderEmail, sendMail, withoutWebFonts } from "@/lib/mail";
import { optOutSecret, signOptOut } from "@/lib/mailOptOut";
import { parseAddress } from "@/lib/mailSender";
import { prisma } from "@/lib/prisma";

/** Имя «Лиза Андреенко», адрес остаётся из настроек почты. */
export function withLizaFrom(from: string | undefined): string {
  const raw = (from?.trim() || mailFrom()).trim();
  const parsed = parseAddress(raw);
  const email = parsed.email || (parsed.name.includes("@") ? parsed.name : "");
  return email ? `Лиза Андреенко <${email}>` : "Лиза Андреенко";
}

/** Один раз: наставник впервые даёт заданию название. Правка и пустое создание — нет. */
export function shouldSendNewTaskMail(actorRole: string, previousTitle: string, nextTitle: string, alreadySent: boolean): boolean {
  return actorRole === "MENTOR" && !alreadySent && previousTitle.trim() === "" && nextTitle.trim() !== "";
}

export function newTaskUrl(taskId: string): string {
  return `${appUrl()}/dashboard/tasks#task-${taskId}`;
}

export function newTaskDeadlineLine(deadline: Date | null): string | null {
  if (!deadline || Number.isNaN(deadline.getTime())) return null;
  const text = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(deadline);
  return `Срок — ${text}.`;
}

export function newTaskGreeting(fullName: string): string {
  const who = greetingName(fullName);
  const form = addressForm(who || fullName);
  const rest = form.formal ? "у Вас новое задание." : "у тебя новое задание.";
  if (!who) return rest.charAt(0).toLocaleUpperCase("ru-RU") + rest.slice(1);
  return `${who}, ${rest}`;
}

export function newTaskLetter(input: {
  name: string;
  title: string;
  deadline: Date | null;
  taskId: string;
  unsubscribeUrl?: string;
}) {
  const greeting = newTaskGreeting(input.name);
  const title = input.title.trim() || "Задание";
  const deadline = newTaskDeadlineLine(input.deadline);
  const blocks: { kind: "p"; text: string }[] = [
    { kind: "p", text: greeting },
    { kind: "p", text: `«${title}».` },
  ];
  if (deadline) blocks.push({ kind: "p", text: deadline });
  const unsubscribe = input.unsubscribeUrl?.trim();
  const letter = withoutWebFonts(
    renderEmail({
      title: "Новое задание",
      blocks,
      action: { label: "Открыть задание", url: newTaskUrl(input.taskId) },
      footnote: unsubscribe
        ? `<a href="${escapeHtml(unsubscribe)}" style="color:#4B3FC0;text-decoration:underline;">Отписаться от писем</a>`
        : undefined,
      signature: EMAIL_SIGNATURE,
      formal: usesFormalAddress(input.name),
    }),
    greeting,
  );
  return { subject: `Новое задание: ${title}`, ...letter };
}

/** Сразу ученику. Не в пачку «Наставник внёс правку». Ошибка почты название не откатывает. */
export async function notifyStudentOfNewTask(input: {
  studentId: string;
  taskId: string;
  title: string;
  deadline: Date | null;
}) {
  try {
    const gate = await mailGate("new-task", input.studentId);
    if (!gate.ok) return;
    const student = await prisma.user.findUnique({
      where: { id: input.studentId },
      select: { id: true, name: true, email: true, role: true, emailNotifications: true },
    });
    if (!student || student.role !== "STUDENT" || !student.email || !student.emailNotifications) return;
    const secret = optOutSecret();
    const unsubscribeUrl = secret ? `${appUrl()}/unsubscribe?token=${signOptOut(student.id, "mail", secret)}` : undefined;
    const letter = newTaskLetter({
      name: student.name,
      title: input.title,
      deadline: input.deadline,
      taskId: input.taskId,
      unsubscribeUrl,
    });
    await sendMail({
      to: student.email,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
      type: "new-task",
      recipientUserId: student.id,
      from: withLizaFrom(gate.from),
      replyTo: gate.replyTo,
      listUnsubscribe: unsubscribeUrl,
    });
  } catch (error) {
    console.error("[mail] новое задание не ушло", error);
  }
}
