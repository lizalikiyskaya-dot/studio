import { prisma } from "@/lib/prisma";
import { appUrl, renderEmail, sendMail, withoutWebFonts } from "@/lib/mail";
import { mailGate } from "@/lib/activityDigest";
import { personName } from "@/features/guides/guideOpenLabel";

export function mentorGuideReadUrl(studentId: string, guideId: string): string {
  return `${appUrl()}/student-view/${studentId}/materials#guide-${guideId}`;
}

export function guideReadLetter(input: { name: string; title: string; url: string }) {
  const who = personName(input.name) || "Ученик";
  const title = input.title.trim() || "без названия";
  const sentence = `${who}: открыта методичка.`;
  const place = `«${title}».`;
  const letter = withoutWebFonts(
    renderEmail({
      title: "Открыта методичка",
      blocks: [
        { kind: "p", text: sentence },
        { kind: "p", text: place },
      ],
      action: { label: "Открыть", url: input.url },
    }),
    sentence,
  );
  return { subject: `${who}: открыта методичка`, ...letter };
}

/** Письмо наставнику только при первом открытии файла учеником. Ошибка почты скачивание не отменяет. */
export async function notifyMentorOfGuideRead(input: { studentId: string; title: string; url: string }) {
  try {
    const gate = await mailGate("guide-read");
    if (!gate.ok) return;
    const [student, liza] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.studentId },
        select: { name: true, role: true },
      }),
      prisma.user.findFirst({
        where: { role: "MENTOR" },
        select: { id: true, email: true, emailNotifications: true },
      }),
    ]);
    if (!student || student.role !== "STUDENT") return;
    if (!liza?.email || !liza.emailNotifications) return;
    const letter = guideReadLetter({ name: student.name, title: input.title, url: input.url });
    await sendMail({
      to: liza.email,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
      type: "guide-read",
      recipientUserId: liza.id,
      from: gate.from,
      replyTo: gate.replyTo,
    });
  } catch (error) {
    console.error("[mail] открытие методички не ушло", error);
  }
}
