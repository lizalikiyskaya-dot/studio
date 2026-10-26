import { prisma } from "@/lib/prisma";
import { appUrl, renderEmail, sendMail, withoutWebFonts } from "@/lib/mail";
import { mailGate } from "@/lib/activityDigest";
import { submittedStatusCounts } from "@/features/streak/weeks";

/** Логин в поле имени: Yannie_E, почта, цифры. Обычное имя, в том числе латиницей, остаётся. */
export function isAccountLogin(token: string): boolean {
  if (/[_\d@]/.test(token)) return true;
  if (/[А-Яа-яЁё]/.test(token)) return false;
  return /[a-z][A-Z]/.test(token);
}

/** Живое имя для письма наставнику. Логин не подставляется. Надежда не сокращается. */
export function submissionStudentName(fullName: string): string {
  const kept: string[] = [];
  for (const raw of fullName.trim().split(/\s+/)) {
    const token = raw.replace(/^[«"(\[]+|[»").,\]]+$/g, "");
    if (!token || isAccountLogin(token)) continue;
    kept.push(token);
  }
  return kept.join(" ");
}

export function shouldNotifySubmission(actorRole: string, previous: string | null | undefined, next: string): boolean {
  return actorRole === "STUDENT" && submittedStatusCounts(previous, next);
}

const EXERCISE_FOCUS = {
  arc: "arc",
  belief: "belief",
  circle: "circle",
  extra: "extra",
} as const;

export type ExerciseFocus = keyof typeof EXERCISE_FOCUS;

export function exerciseFocusIndex(focus: string | undefined): number {
  const order: ExerciseFocus[] = ["arc", "belief", "circle", "extra"];
  const index = order.indexOf(focus as ExerciseFocus);
  return index < 0 ? 0 : index;
}

export function mentorSubmissionUrl(studentId: string, where: "tasks" | ExerciseFocus, id: string): string {
  const home = appUrl();
  if (where === "tasks") return `${home}/student-view/${studentId}/tasks?tab=submitted#task-${id}`;
  return `${home}/student-view/${studentId}/exercises?focus=${EXERCISE_FOCUS[where]}#exercise-${id}`;
}

export function submissionLetter(input: { name: string; section: string; title: string; url: string }) {
  const who = submissionStudentName(input.name) || "Ученик";
  const title = input.title.trim() || "без названия";
  const sentence = `${who}: сдано на проверку.`;
  const place = `${input.section}. «${title}».`;
  const letter = withoutWebFonts(
    renderEmail({
      title: "Сдано на проверку",
      blocks: [
        { kind: "p", text: sentence },
        { kind: "p", text: place },
      ],
      action: { label: "Открыть", url: input.url },
    }),
    sentence,
  );
  return { subject: `${who}: сдано на проверку`, ...letter };
}

/** Письмо наставнику. Только новый переход ученика в «сдано на проверку». Ошибки почты статус не откатывают. */
export async function notifyMentorOfSubmission(input: {
  actorRole: string;
  previous: string | null | undefined;
  next: string;
  studentId: string;
  section: string;
  title: string;
  url: string;
}) {
  if (!shouldNotifySubmission(input.actorRole, input.previous, input.next)) return;
  try {
    const gate = await mailGate("submitted");
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
    const letter = submissionLetter({
      name: student.name,
      section: input.section,
      title: input.title,
      url: input.url,
    });
    await sendMail({
      to: liza.email,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
      type: "submitted",
      recipientUserId: liza.id,
      from: gate.from,
      replyTo: gate.replyTo,
    });
  } catch (error) {
    console.error("[mail] сдача на проверку не ушла", error);
  }
}
