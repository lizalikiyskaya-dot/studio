import { addressForm, usesFormalAddress, withGreeting } from "@/lib/addressForm";
import { EMAIL_SIGNATURE, escapeHtml, renderEmail, sendMail, type RenderedEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export function taskDecisionLetter(input: {
  name: string;
  group: "accepted" | "revision";
  title: string;
  url: string;
}): RenderedEmail {
  const accepted = input.group === "accepted";
  const form = addressForm(input.name);
  const title = input.title.trim() || "Задание";
  return renderEmail({
    title: accepted ? "Наставник принял задание" : "Наставник отправил на доработку",
    paragraphs: [
      escapeHtml(
        withGreeting(
          input.name,
          accepted
            ? `я приняла задание «${title}».`
            : `я отправила задание «${title}» на доработку.`,
        ),
      ),
      accepted
        ? "Оно во вкладке «Принятые»."
        : `Что поправить, написано в задании. Когда будет готово, ${form.submit} его снова.`,
    ],
    action: { label: "Открыть задание", url: input.url },
    signature: EMAIL_SIGNATURE,
    formal: usesFormalAddress(input.name),
  });
}

/** Сразу, отдельным письмом. В суточную сводку правок это не кладётся. */
export async function sendTaskDecisionMail(input: {
  studentId: string;
  group: "accepted" | "revision";
  title: string;
  url: string;
}): Promise<boolean> {
  const student = await prisma.user.findUnique({
    where: { id: input.studentId },
    select: { name: true, email: true, status: true, emailNotifications: true },
  });
  if (!student?.email || !student.email.includes("@")) return false;
  if (student.status !== "APPROVED" || !student.emailNotifications) return false;
  const letter = taskDecisionLetter({
    name: student.name,
    group: input.group,
    title: input.title,
    url: input.url,
  });
  const type = input.group === "accepted" ? "task-accepted" : "task-revision";
  const subject = input.group === "accepted" ? "Наставник принял задание" : "Наставник отправил на доработку";
  return sendMail({
    to: student.email,
    subject,
    html: letter.html,
    text: letter.text,
    type,
    recipientUserId: input.studentId,
  });
}
