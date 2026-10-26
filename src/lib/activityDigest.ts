import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mail";
import { SECTION_LABELS, sectionLabel } from "@/lib/sections";
import {
  groupsReady,
  isSessionStart,
  mergeDetail,
  sameCalendarDay,
  timeZoneLabel,
  zonedClock,
  type BroadcastSetting,
  type DigestRow,
} from "@/lib/mailBroadcasts";
import { withAddress } from "@/lib/addressForm";
import { mentorDigestGroups, mentorWorkLetter, studentOnlineLetter, studentWorkLetter, type DigestPiece } from "@/lib/activityLetters";
import { broadcastOpen, envelopeFor, readBroadcast, whoFor, type BroadcastRead } from "@/lib/mailBroadcastStore";
import { applyLetterTemplate, type LetterKey } from "@/lib/letterTemplates";
import { readLetterTemplate } from "@/lib/letterTemplateStore";

const globalState = globalThis as unknown as { activityDigestStarted?: boolean };
const TICK_MS = 15 * 60 * 1000;
const FIRST_TICK_MS = 25_000;

export const MODEL_SECTION: Record<string, string> = {
  Book: "about",
  Cycle: "cycles",
  PlanChapter: "plan",
  Character: "dossier",
  PopArcCharacter: "arcs",
  Act: "acts",
  BeliefCard: "acts",
  FreeSection: "exercises",
  StoryCircleCard: "arcs",
  GrapesSetting: "setting",
  Note: "notes",
  Task: "tasks",
  Draft: "drafts",
  Material: "materials",
};

function missingDigest(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string }).code;
  return code === "P2021" || code === "P2022" || message.includes("MailDigest") || message.includes("MailBroadcast");
}

export async function queueCabinetChange(input: {
  studentId: string;
  byMentor: boolean;
  section: string;
  detail?: string;
}): Promise<"legacy" | "queued" | "off"> {
  const kind = input.byMentor ? "mentor-edit" : "student-edit";
  let read: BroadcastRead;
  try {
    read = await readBroadcast(kind);
  } catch (error) {
    console.error("[mail] настройка пачки не прочитана", error);
    return "off";
  }
  if (read.legacy) return "legacy";
  if (!read.setting.enabled) return "off";
  if (read.setting.audience === "chosen" && whoFor(kind) === "students") {
    const ids = read.setting.studentIds.split(",").filter(Boolean);
    if (!ids.includes(input.studentId)) return "off";
  }
  const section = input.section || "tasks";
  const detail = (input.detail ?? sectionLabel(section)).trim();
  try {
    const open = await prisma.mailDigest.findFirst({
      where: { kind, studentId: input.studentId, section, sentAt: null },
    });
    if (open) {
      // Строка со ссылкой относится к одному месту: новая заменяет старую, а не клеится через точку с запятой.
      const next = nextDigestDetail(open.detail, detail);
      if (next !== open.detail) {
        await prisma.mailDigest.update({ where: { id: open.id }, data: { detail: next } });
      }
      return "queued";
    }
    await prisma.mailDigest.create({
      data: { kind, studentId: input.studentId, section, detail },
    });
    return "queued";
  } catch (error) {
    if (missingDigest(error)) return "legacy";
    console.error("[mail] пачка не записана", error);
    return "off";
  }
}

export async function queueStudentOnline(studentId: string, now = new Date()): Promise<void> {
  const read = await readBroadcast("student-online").catch(() => ({ legacy: true } as const));
  if (read.legacy || !read.setting.enabled) return;
  const setting = read.setting;
  if (setting.oncePerDay) {
    const previous = await prisma.mailDigest.findFirst({
      where: { kind: "student-online", studentId, sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
    });
    if (previous?.sentAt && sameCalendarDay(previous.sentAt, now, setting.timeZone)) return;
  }
  const clock = zonedClock(now, setting.timeZone);
  const when = `${clock.day}.${String(clock.month).padStart(2, "0")}.${clock.year}, ${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}, ${timeZoneLabel(setting.timeZone)}`;
  const open = await prisma.mailDigest.findFirst({
    where: { kind: "student-online", studentId, sentAt: null },
  });
  if (!open) {
    await prisma.mailDigest.create({
      data: { kind: "student-online", studentId, section: "tasks", detail: when },
    });
  }
}

type Person = { id: string; name: string; email: string; status: string; emailNotifications: boolean };

export async function flushDigests(options: {
  now: Date;
  settings: (key: "mentor-edit" | "student-edit" | "student-online") => Promise<BroadcastSetting | null>;
  list: (kind: string) => Promise<DigestRow[]>;
  markSent: (ids: string[], sentAt: Date) => Promise<void>;
  student: (id: string) => Promise<Person | null>;
  mentor: () => Promise<Person | null>;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: string;
    recipientUserId: string;
    from?: string;
    replyTo?: string;
  }) => Promise<boolean>;
  envelope: (sender: "env" | "profile") => Promise<{ from: string; replyTo?: string }>;
  dress?: (
    key: LetterKey,
    designed: { subject: string; html: string; text: string },
    vars: Record<string, string>,
  ) => Promise<{ subject: string; html: string; text: string }>;
}): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;
  const kinds = ["mentor-edit", "student-edit", "student-online"] as const;
  for (const kind of kinds) {
    const setting = await options.settings(kind);
    if (!setting?.enabled) continue;
    const rows = await options.list(kind);
    const groups = groupsReady(rows, options.now, setting.windowMinutes);
    for (const group of groups) {
      const studentId = group[0].studentId;
      const student = await options.student(studentId);
      if (!student) {
        skipped += 1;
        continue;
      }
      const pieces: DigestPiece[] = group.map((row) => ({ section: row.section, detail: row.detail }));
      let to = "";
      let recipientUserId = "";
      let subject = "";
      let html = "";
      let text = "";
      const type = kind;
      if (kind === "mentor-edit") {
        if (student.status !== "APPROVED" || !student.emailNotifications || !student.email.includes("@")) {
          skipped += 1;
          continue;
        }
        const letter = mentorWorkLetter({ name: student.name, studentId, pieces });
        to = student.email;
        recipientUserId = student.id;
        subject = "Наставник внёс правку";
        html = letter.html;
        text = letter.text;
      } else {
        const mentor = await options.mentor();
        if (!mentor?.email || !mentor.emailNotifications) {
          skipped += 1;
          continue;
        }
        if (kind === "student-online") {
          const letter = studentOnlineLetter({
            name: student.name,
            studentId,
            when: group[0].detail || "",
          });
          subject = `${student.name} в кабинете`;
          html = letter.html;
          text = letter.text;
        } else {
          const letter = studentWorkLetter({ name: student.name, studentId, pieces });
          subject = `${student.name}: новые правки в кабинете`;
          html = letter.html;
          text = letter.text;
        }
        to = mentor.email;
        recipientUserId = mentor.id;
      }
      if (options.dress) {
        const sectionKey = pieces[0]?.section.split(":")[0] || "tasks";
        const path = sectionKey in SECTION_LABELS ? (sectionKey === "notes" ? "tasks" : sectionKey) : "tasks";
        const linked = pieces.map((piece) => piece.detail.split("\t")[1]?.trim()).find((url) => url?.startsWith("http"));
        const cabinet = kind === "mentor-edit"
          ? linked || `${appUrl()}/dashboard/${path}`
          : `${appUrl()}/student-view/${studentId}/${path}`;
        const dressed = await options.dress(kind, { subject, html, text }, withAddress(student.name, {
          имя: student.name,
          правки: editsText(pieces),
          когда: group[0].detail || "",
          кабинет: cabinet,
        }));
        subject = dressed.subject;
        html = dressed.html;
        text = dressed.text;
      }
      const envelope = await options.envelope(setting.sender);
      const ok = await options.send({
        to,
        subject,
        html,
        text,
        type,
        recipientUserId,
        from: envelope.from,
        replyTo: envelope.replyTo,
      });
      if (!ok) {
        skipped += 1;
        continue;
      }
      await options.markSent(group.map((row) => row.id), options.now);
      sent += 1;
    }
  }
  return { sent, skipped };
}

async function loadStudent(id: string): Promise<Person | null> {
  const row = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, status: true, emailNotifications: true, role: true },
  });
  if (!row || row.role !== "STUDENT") return null;
  return row;
}

async function loadMentor(): Promise<Person | null> {
  const row = await prisma.user.findFirst({
    where: { role: "MENTOR" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, status: true, emailNotifications: true },
  });
  return row;
}

/** Строка со ссылкой относится к одному месту и заменяет прошлую. Остальное клеится. */
export function nextDigestDetail(open: string, detail: string): string {
  return detail.includes("\t") ? detail.slice(0, 500) : mergeDetail(open, detail);
}

function pieceLines(title: string, items: string[]): string {
  const lines = items.flatMap((item) => (item.includes("\t") ? [item] : item.split("; ").map((part) => part.trim()).filter((part) => part && part !== title)));
  return [title, ...(lines.length > 0 ? lines : ["Есть новые правки."])].join("\n");
}

const DIGEST_GROUP_TITLES = new Set(["Принято", "На доработке", "Заметки", "Правки", "Отзыв"]);

function editsText(pieces: DigestPiece[]): string {
  const groups = mentorDigestGroups(pieces);
  if (groups.length === 0) return "Есть новые правки.";
  return groups
    .map((group) => pieceLines(DIGEST_GROUP_TITLES.has(group.title) ? group.title : sectionLabel(group.title), group.items))
    .join("\n\n");
}

export async function runScheduledDigests(now = new Date()) {
  return flushDigests({
    now,
    settings: async (key) => {
      const read = await readBroadcast(key);
      if (read.legacy) return null;
      return read.setting;
    },
    list: async (kind) =>
      prisma.mailDigest.findMany({
        where: { kind, sentAt: null },
        orderBy: { createdAt: "asc" },
      }),
    markSent: async (ids, sentAt) => {
      await prisma.mailDigest.updateMany({ where: { id: { in: ids } }, data: { sentAt } });
    },
    student: loadStudent,
    mentor: loadMentor,
    send: (input) => sendMail(input),
    envelope: envelopeFor,
    dress: async (key, designed, vars) => applyLetterTemplate(key, await readLetterTemplate(key), designed, vars),
  });
}

export function startActivityDigestScheduler() {
  if (globalState.activityDigestStarted) return;
  globalState.activityDigestStarted = true;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.npm_lifecycle_event === "build") return;
  if (process.env.NODE_ENV !== "production") return;

  const tick = () => {
    runScheduledDigests().catch((error) => {
      console.error("[mail] пачка писем не ушла:", error);
    });
  };
  const first = setTimeout(tick, FIRST_TICK_MS);
  first.unref?.();
  const timer = setInterval(tick, TICK_MS);
  timer.unref?.();
}

export async function noteSession(studentId: string, lastSeen: Date | null, now = new Date()) {
  if (!isSessionStart(lastSeen, now)) return;
  try {
    await queueStudentOnline(studentId, now);
    await runScheduledDigests(now);
  } catch (error) {
    if (!missingDigest(error)) console.error("[mail] визит не записан", error);
  }
}

export async function mailGate(
  key: Parameters<typeof broadcastOpen>[0],
  studentId?: string,
): Promise<{ ok: boolean; from?: string; replyTo?: string }> {
  const opened = await broadcastOpen(key, studentId);
  if (!opened.ok || !opened.setting) return { ok: false };
  if (opened.setting.sender === "env") return { ok: true, ...(await envelopeFor("env")) };
  return { ok: true };
}
