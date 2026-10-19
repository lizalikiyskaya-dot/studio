import { progressKind } from "@/features/acts/chapterText";
import { effectivePaymentDay, moscowParts } from "@/lib/paymentReminders";

export type FocusTask = {
  title: string;
  deadline: Date | null;
  order: number;
  updatedAt: Date;
};

export type FocusChapter = {
  title: string;
  order: number;
  writtenChars: number;
  plannedChars: number;
  bookCreatedAt: Date;
};

export type FocusStory = {
  title: string;
  order: number;
  started: boolean;
};

export type FocusBook = {
  title: string;
  createdAt: Date;
  started: boolean;
};

export type FocusSource = {
  tasks: FocusTask[];
  chapters: FocusChapter[];
  stories: FocusStory[];
  books: FocusBook[];
};

export type NearestDeadline = {
  id: string;
  studentId: string;
  student: string;
  title: string;
  deadline: Date;
  status: string;
};

export type NearestDeadlineView = {
  id: string;
  href: string;
  student: string;
  title: string;
  when: string;
  hot: boolean;
};

export type NearestPayment = {
  id: string;
  name: string;
  paymentDay: number;
  paymentAmount: number | null;
};

export type NearestPaymentView = {
  id: string;
  student: string;
  when: string;
  amount: string | null;
};

function startStamp(date: Date): string {
  const parts = moscowParts(date);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function stampNumber(stamp: string): number {
  const [year, month, day] = stamp.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function daysFromToday(date: Date, now: Date): number {
  return stampNumber(startStamp(date)) - stampNumber(startStamp(now));
}

function dayMonth(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Moscow",
  })
    .format(date)
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function whenLabel(date: Date, now: Date): string {
  const diff = daysFromToday(date, now);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  return dayMonth(date);
}

function pickTask(tasks: FocusTask[], now: Date): FocusTask {
  const today = stampNumber(startStamp(now));
  const upcoming = tasks
    .filter((task) => task.deadline && stampNumber(startStamp(task.deadline)) >= today)
    .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime() || a.order - b.order);
  if (upcoming[0]) return upcoming[0];
  return [...tasks].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || a.order - b.order)[0];
}

function chapterLabel(chapter: FocusChapter): string {
  const title = chapter.title.trim();
  const number = chapter.order + 1;
  if (title) return `Глава ${number}, «${title}»`;
  return `Глава ${number}`;
}

function storyLabel(story: FocusStory): string {
  const title = story.title.trim() || "без названия";
  return `Рассказ «${title}»`;
}

export function currentWorkLabel(source: FocusSource, now = new Date()): string | null {
  const tasks = source.tasks.filter((task) => task.title.trim());
  if (tasks.length > 0) return pickTask(tasks, now).title.trim();

  const chapters = source.chapters
    .filter((chapter) => {
      const kind = progressKind(chapter.writtenChars, chapter.plannedChars);
      return kind === "work" || kind === "almost";
    })
    .sort((a, b) => a.bookCreatedAt.getTime() - b.bookCreatedAt.getTime() || a.order - b.order);
  if (chapters[0]) return chapterLabel(chapters[0]);

  const stories = source.stories
    .filter((story) => story.started)
    .sort((a, b) => a.order - b.order);
  if (stories[0]) return storyLabel(stories[0]);

  const books = source.books
    .filter((book) => book.started && book.title.trim())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  if (books[0]) return books[0].title.trim();

  return null;
}

export function nearestDeadlineViews(
  rows: NearestDeadline[],
  now = new Date(),
  limit = 4,
): NearestDeadlineView[] {
  const today = stampNumber(startStamp(now));
  return rows
    .filter((row) => row.status !== "ACCEPTED" && row.deadline && stampNumber(startStamp(row.deadline)) >= today)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime() || a.student.localeCompare(b.student, "ru"))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      href: `/student-view/${row.studentId}/tasks`,
      student: row.student,
      title: row.title.trim() || "Задание",
      when: whenLabel(row.deadline, now),
      hot: daysFromToday(row.deadline, now) <= 1,
    }));
}

function nextPayment(paymentDay: number, now: Date): { year: number; month: number; day: number } {
  const parts = moscowParts(now);
  let year = parts.year;
  let month = parts.month;
  let day = effectivePaymentDay(paymentDay, year, month);
  if (day < parts.day) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    day = effectivePaymentDay(paymentDay, year, month);
  }
  return { year, month, day };
}

function paymentWhen(paymentDay: number, now: Date): string {
  const next = nextPayment(paymentDay, now);
  const parts = moscowParts(now);
  const diff = Date.UTC(next.year, next.month - 1, next.day) / 86400000 - Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000;
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  return `${next.day}-го`;
}

function rubles(amount: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
}

export function nearestPaymentViews(
  rows: NearestPayment[],
  now = new Date(),
  limit = 4,
): NearestPaymentView[] {
  return rows
    .filter((row) => Number.isInteger(row.paymentDay) && row.paymentDay >= 1 && row.paymentDay <= 31)
    .map((row) => ({ row, next: nextPayment(row.paymentDay, now) }))
    .sort((a, b) => {
      const aKey = a.next.year * 10000 + a.next.month * 100 + a.next.day;
      const bKey = b.next.year * 10000 + b.next.month * 100 + b.next.day;
      if (aKey !== bKey) return aKey - bKey;
      return a.row.name.localeCompare(b.row.name, "ru");
    })
    .slice(0, limit)
    .map(({ row }) => ({
      id: row.id,
      student: row.name,
      when: paymentWhen(row.paymentDay, now),
      amount: row.paymentAmount == null ? null : rubles(row.paymentAmount),
    }));
}
