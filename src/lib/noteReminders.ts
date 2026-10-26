import { addressForm, greetingName } from "@/lib/addressForm";
import type { BroadcastSetting } from "@/lib/mailBroadcasts";
import { clockOpen, parseStudentIds, zonedClock } from "@/lib/mailBroadcasts";
import { EMAIL_SIGNATURE, escapeHtml, renderEmail } from "@/lib/mail";
import { optOutLinkLabel } from "@/lib/mailOptOut";
import { sectionLabel } from "@/lib/sections";

export { greetingName };

export const NOTE_REMINDER_ZONE = "Europe/Moscow";
export const NOTE_REMINDER_AGE_MS = 14 * 24 * 60 * 60 * 1000;
export const NOTE_REMINDER_GAP_MS = 7 * 24 * 60 * 60 * 1000;

export type ReminderNote = {
  id: string;
  studentId: string;
  authorRole: string;
  resolved: boolean;
  createdAt: Date;
  anchorLabel: string;
  anchorUrl: string;
};

export type ReminderStudent = {
  id: string;
  name: string;
  email: string;
  status: string;
  emailNotifications: boolean;
};

export type ReminderSend = {
  noteId: string;
  sentAt: Date;
};

export type NoteLetter = { subject: string; html: string; text: string };

export type NoteReminderPlan = {
  student: ReminderStudent;
  notes: ReminderNote[];
  letter: NoteLetter;
};

export type NoteReminderRunResult = {
  planned: number;
  sent: number;
  alreadySent: number;
  failed: number;
  dryRun: boolean;
  skipped: "disabled" | "not-morning" | "no-table" | null;
};

export function noteReminderDryRun(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.NOTE_REMINDER_DRY_RUN;
  return flag === "1" || flag === "true" || env.NODE_ENV !== "production";
}

export function noteReminderLogLine(result: Pick<NoteReminderRunResult, "planned" | "sent" | "alreadySent" | "failed" | "dryRun">): string {
  return `[note-reminder] к отправке ${result.planned}, ушло ${result.sent}, уже было ${result.alreadySent}, ошибок ${result.failed}, dry-run ${result.dryRun}`;
}

export function noteReminderOpening(name: string): string {
  const who = greetingName(name);
  if (addressForm(name).formal) return who ? `${who}, здравствуйте.` : "Здравствуйте.";
  return who ? `Привет, ${who}!` : "Привет!";
}

export function noteSectionKey(url: string): string {
  const match = /\/(?:dashboard|student-view\/[^/]+)\/([a-z-]+)/.exec(url);
  return match?.[1] ?? "";
}

export function bookIdFromUrl(url: string): string {
  const noHash = url.split("#")[0] ?? "";
  const query = noHash.includes("?") ? noHash.slice(noHash.indexOf("?") + 1) : "";
  return new URLSearchParams(query).get("book")?.trim() ?? "";
}

/** Ссылка ученика. Адрес кабинета наставника в письмо не попадает. */
export function studentNoteHref(baseUrl: string, anchorUrl: string): string {
  const home = baseUrl.replace(/\/+$/, "");
  const raw = anchorUrl.trim();
  if (!raw) return `${home}/dashboard/tasks#notes`;
  let path = raw;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    path = raw;
  }
  const hashAt = path.indexOf("#");
  const hash = hashAt >= 0 ? path.slice(hashAt) : "";
  const beforeHash = hashAt >= 0 ? path.slice(0, hashAt) : path;
  const queryAt = beforeHash.indexOf("?");
  const pathname = queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash;
  const search = queryAt >= 0 ? beforeHash.slice(queryAt) : "";
  let next = pathname.replace(/^\/student-view\/[^/]+/, "/dashboard");
  if (!next.startsWith("/")) next = `/${next}`;
  if (!next.startsWith("/dashboard")) next = `/dashboard${next}`;
  return `${home}${next}${search}${hash}`;
}

type PlaceParts = { title: string; section: string };

/** Книга или подпись якоря, и раздел страницы. Пустой title: строка — это только раздел. */
function placeParts(note: Pick<ReminderNote, "anchorLabel" | "anchorUrl">, bookTitle = ""): PlaceParts {
  const key = noteSectionKey(note.anchorUrl);
  const section = key ? sectionLabel(key) : "";
  const book = bookTitle.trim();
  const label = note.anchorLabel.trim();
  if (book) return { title: book, section };
  if (label && label !== section && label !== "Страница") return { title: label, section };
  return { title: "", section: section || label || "Заметки" };
}

/** Книга, если она есть в ссылке, и раздел страницы. */
export function notePlace(note: Pick<ReminderNote, "anchorLabel" | "anchorUrl">, bookTitle = ""): string {
  const { title, section } = placeParts(note, bookTitle);
  if (title) return section ? `${title}, ${section}` : title;
  return section || "Заметки";
}

export function notesUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/dashboard/tasks#notes`;
}

/** заметка / заметки / заметок. 1, 21 — одна; 2–4 — несколько; 5, 11 — много. */
export function noteWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "заметка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "заметки";
  return "заметок";
}

/** Заметку написал наставник. «Вы оставили» здесь не подходит. */
export function noteCountSentence(name: string, count: number): string {
  const you = addressForm(name).formal ? "Вас" : "тебя";
  const word = noteWord(count);
  const which = word === "заметка" ? "которая открыта" : "которые открыты";
  return `У ${you} ${count} ${word} наставника, ${which} больше двух недель.`;
}

function formatPlaceLabel(parts: PlaceParts, count: number): string {
  const tail = `${count} ${noteWord(count)}`;
  if (parts.title && parts.section) return `«${parts.title}», ${parts.section}: ${tail}`;
  if (parts.title) return `«${parts.title}»: ${tail}`;
  return `${parts.section}: ${tail}`;
}

export function placeLines(
  notes: Pick<ReminderNote, "anchorLabel" | "anchorUrl">[],
  bookTitles: ReadonlyMap<string, string>,
): { label: string; url: string }[] {
  const counts = new Map<string, { parts: PlaceParts; count: number; url: string }>();
  for (const note of notes) {
    const parts = placeParts(note, bookTitles.get(bookIdFromUrl(note.anchorUrl)) ?? "");
    const key = `${parts.title}\0${parts.section}`;
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { parts, count: 1, url: note.anchorUrl });
  }
  return [...counts.values()]
    .map((item) => ({ label: formatPlaceLabel(item.parts, item.count), url: item.url }))
    .sort((a, b) => a.label.localeCompare(b.label, "ru"));
}

function noteFoot(url: string | undefined): string {
  const base = "Письмо приходит утром, если заметка наставника открыта больше двух недель. По тем же заметкам повтор не чаще раза в неделю.";
  if (!url) return base;
  return `${base}<br><a href="${escapeHtml(url)}" style="color:#4B3FC0;text-decoration:underline;">${escapeHtml(optOutLinkLabel("mail"))}</a>`;
}

export function noteIsOld(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() > NOTE_REMINDER_AGE_MS;
}

export function noteRemindedRecently(sentAt: Date | null, now: Date): boolean {
  if (!sentAt) return false;
  return now.getTime() - sentAt.getTime() < NOTE_REMINDER_GAP_MS;
}

export function dueNotes(notes: ReminderNote[], sends: ReminderSend[], now: Date): ReminderNote[] {
  const latest = new Map<string, Date>();
  for (const send of sends) {
    const prev = latest.get(send.noteId);
    if (!prev || send.sentAt > prev) latest.set(send.noteId, send.sentAt);
  }
  return notes.filter((note) => {
    if (note.resolved || note.authorRole !== "MENTOR") return false;
    if (!noteIsOld(note.createdAt, now)) return false;
    return !noteRemindedRecently(latest.get(note.id) ?? null, now);
  });
}

export function noteSkipReason(student: ReminderStudent, setting: BroadcastSetting): string | null {
  if (student.status !== "APPROVED") return "Ученик ещё не одобрен.";
  if (!student.emailNotifications) return "У ученика выключена почта.";
  if (!student.email.includes("@")) return "У ученика нет почты.";
  if (setting.audience === "chosen" && !parseStudentIds(setting.studentIds).includes(student.id)) return "Ученик не в списке этой рассылки.";
  return null;
}

export function buildNoteReminderLetter(input: {
  name: string;
  notes: Pick<ReminderNote, "anchorLabel" | "anchorUrl">[];
  bookTitles?: ReadonlyMap<string, string>;
  baseUrl: string;
  unsubscribeUrl?: string;
}): NoteLetter {
  const formal = addressForm(input.name).formal;
  const count = input.notes.length;
  const closing = formal
    ? count === 1
      ? "Посмотрите её и закройте, если она уже не нужна."
      : "Посмотрите их и закройте, если они уже не нужны."
    : count === 1
      ? "Посмотри её и закрой, если она уже не нужна."
      : "Посмотри их и закрой, если они уже не нужны.";
  const home = input.baseUrl.replace(/\/+$/, "");
  const places = placeLines(input.notes, input.bookTitles ?? new Map()).map(
    (place) => `${place.label}\t${studentNoteHref(home, place.url)}`,
  );
  const subject = "Открытые заметки";
  const letter = renderEmail({
    title: subject,
    blocks: [
      { kind: "p", text: noteReminderOpening(input.name) },
      { kind: "p", text: noteCountSentence(input.name, count) },
      { kind: "section", title: "Где", items: places },
      { kind: "p", text: closing },
    ],
    action: { label: "Открыть заметки", url: notesUrl(home) },
    footnote: noteFoot(input.unsubscribeUrl),
    signature: EMAIL_SIGNATURE,
    siteUrl: home,
  });
  return { subject, html: letter.html, text: letter.text };
}

export function planNoteReminders(input: {
  now: Date;
  setting: BroadcastSetting;
  students: ReminderStudent[];
  notes: ReminderNote[];
  sends: ReminderSend[];
  bookTitles?: ReadonlyMap<string, string>;
  baseUrl: string;
  /** Превью и ручная проверка: не смотреть, включена ли рассылка и наступило ли утро. */
  ignoreSchedule?: boolean;
  unsubscribeUrl?: (studentId: string) => string | null;
}): { plans: NoteReminderPlan[]; alreadySent: number; skipped: NoteReminderRunResult["skipped"] } {
  if (!input.ignoreSchedule && !input.setting.enabled) {
    return { plans: [], alreadySent: 0, skipped: "disabled" };
  }
  if (!input.ignoreSchedule && !clockOpen(zonedClock(input.now, input.setting.timeZone), input.setting)) {
    return { plans: [], alreadySent: 0, skipped: "not-morning" };
  }
  const people = new Map(input.students.map((student) => [student.id, student]));
  const ready = dueNotes(input.notes, input.sends, input.now);
  const cooled = input.notes.filter((note) => {
    if (note.resolved || note.authorRole !== "MENTOR" || !noteIsOld(note.createdAt, input.now)) return false;
    return !ready.some((item) => item.id === note.id);
  }).length;
  const byStudent = new Map<string, ReminderNote[]>();
  for (const note of ready) {
    const student = people.get(note.studentId);
    if (!student || noteSkipReason(student, input.setting)) continue;
    const list = byStudent.get(student.id) ?? [];
    list.push(note);
    byStudent.set(student.id, list);
  }
  const plans: NoteReminderPlan[] = [];
  for (const [studentId, notes] of byStudent) {
    const student = people.get(studentId);
    if (!student || notes.length === 0) continue;
    plans.push({
      student,
      notes,
      letter: buildNoteReminderLetter({
        name: student.name,
        notes,
        bookTitles: input.bookTitles,
        baseUrl: input.baseUrl,
        unsubscribeUrl: input.unsubscribeUrl?.(student.id) ?? undefined,
      }),
    });
  }
  plans.sort((a, b) => a.student.name.localeCompare(b.student.name, "ru"));
  return { plans, alreadySent: cooled, skipped: null };
}

export async function deliverNoteReminders(options: {
  now: Date;
  setting: BroadcastSetting;
  students: ReminderStudent[];
  notes: ReminderNote[];
  sends: ReminderSend[];
  bookTitles?: ReadonlyMap<string, string>;
  baseUrl: string;
  dryRun?: boolean;
  ignoreSchedule?: boolean;
  send: (input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    type: "note-reminder";
    recipientUserId: string;
    listUnsubscribe?: string;
  }) => Promise<boolean>;
  record: (studentId: string, noteIds: string[]) => Promise<void>;
  unsubscribeUrl?: (studentId: string) => string | null;
}): Promise<NoteReminderRunResult> {
  const dryRun = options.dryRun === true;
  const plannedSet = planNoteReminders(options);
  if (plannedSet.skipped) {
    return { planned: 0, sent: 0, alreadySent: plannedSet.alreadySent, failed: 0, dryRun, skipped: plannedSet.skipped };
  }
  let sent = 0;
  let failed = 0;
  for (const plan of plannedSet.plans) {
    if (dryRun) {
      sent += 1;
      continue;
    }
    const unsubscribeUrl = options.unsubscribeUrl?.(plan.student.id) ?? undefined;
    const ok = await options.send({
      to: plan.student.email,
      subject: plan.letter.subject,
      html: plan.letter.html,
      text: plan.letter.text,
      type: "note-reminder",
      recipientUserId: plan.student.id,
      listUnsubscribe: unsubscribeUrl,
    });
    if (!ok) {
      failed += 1;
      continue;
    }
    await options.record(plan.student.id, plan.notes.map((note) => note.id));
    sent += 1;
  }
  return {
    planned: plannedSet.plans.length,
    sent,
    alreadySent: plannedSet.alreadySent,
    failed,
    dryRun,
    skipped: null,
  };
}
