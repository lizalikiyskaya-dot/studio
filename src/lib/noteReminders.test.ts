import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import { defaultBroadcast } from "./mailBroadcasts";
import {
  buildNoteReminderLetter,
  deliverNoteReminders,
  dueNotes,
  greetingName,
  noteCountSentence,
  noteIsOld,
  notePlace,
  noteReminderOpening,
  noteWord,
  NOTE_REMINDER_AGE_MS,
  NOTE_REMINDER_GAP_MS,
  planNoteReminders,
  studentNoteHref,
  type ReminderNote,
  type ReminderStudent,
} from "./noteReminders";

const now = new Date("2026-10-26T06:00:00Z");
const old = new Date(now.getTime() - NOTE_REMINDER_AGE_MS - 60_000);
const fresh = new Date(now.getTime() - NOTE_REMINDER_AGE_MS + 60_000);

function note(partial: Partial<ReminderNote> & Pick<ReminderNote, "id" | "studentId">): ReminderNote {
  return {
    authorRole: "MENTOR",
    resolved: false,
    createdAt: old,
    anchorLabel: "",
    anchorUrl: "/dashboard/setting",
    ...partial,
  };
}

function student(partial: Partial<ReminderStudent> & Pick<ReminderStudent, "id" | "name">): ReminderStudent {
  return {
    email: `${partial.id}@example.com`,
    status: "APPROVED",
    emailNotifications: true,
    ...partial,
  };
}

test("рассылка заметок выключена, пока наставник сам её не включит", () => {
  const setting = defaultBroadcast("note-reminder");
  assert.equal(setting.enabled, false);
  assert.equal(setting.hour, 9);
  assert.equal(setting.timeZone, "Europe/Moscow");
  const sql = fs.readFileSync("docs/sql/2026-10-28-note-reminder.sql", "utf8");
  assert.equal(findDestructive(sql).length, 0);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "NoteReminderSend"/);
});

test("приветствие: Надя на «ты», Виктория на «Вы» и без сокращения", () => {
  assert.equal(greetingName("Надежда"), "Надя");
  assert.equal(greetingName("Виктория Сергеевна"), "Виктория");
  assert.equal(noteReminderOpening("Надежда"), "Привет, Надя!");
  assert.equal(noteReminderOpening("Виктория"), "Виктория, здравствуйте.");
  assert.equal(/(?<![\p{L}])Вика(?![\p{L}])/u.test(noteReminderOpening("Виктория")), false);
  assert.equal(noteReminderOpening("Саша"), "Привет, Саша!");
  assert.equal(noteReminderOpening("Yannie_E"), "Привет!");
});

test("место заметки — книга и раздел, ссылка ведёт в кабинет ученика", () => {
  assert.equal(notePlace({ anchorLabel: "Сеттинг", anchorUrl: "/dashboard/setting" }), "Сеттинг");
  assert.equal(
    notePlace(
      { anchorLabel: "Сеттинг", anchorUrl: "/dashboard/setting?book=book-1" },
      "Тихий дом",
    ),
    "Тихий дом, Сеттинг",
  );
  assert.equal(
    studentNoteHref("https://studio.lizandwriter.ru", "/student-view/abc/setting?book=book-1#setting-9"),
    "https://studio.lizandwriter.ru/dashboard/setting?book=book-1#setting-9",
  );
});

test("в письмо попадают только старые открытые заметки наставника, и не чаще раза в неделю", () => {
  const notes = [
    note({ id: "old", studentId: "n" }),
    note({ id: "young", studentId: "n", createdAt: fresh }),
    note({ id: "done", studentId: "n", resolved: true }),
    note({ id: "own", studentId: "n", authorRole: "STUDENT" }),
    note({ id: "repeat", studentId: "n", anchorUrl: "/dashboard/about", anchorLabel: "О книге" }),
  ];
  assert.equal(noteIsOld(fresh, now), false);
  assert.equal(noteIsOld(old, now), true);
  const due = dueNotes(notes, [{ noteId: "repeat", sentAt: new Date(now.getTime() - NOTE_REMINDER_GAP_MS + 60_000) }], now);
  assert.deepEqual(due.map((item) => item.id), ["old"]);
  const again = dueNotes(notes, [{ noteId: "repeat", sentAt: new Date(now.getTime() - NOTE_REMINDER_GAP_MS) }], now);
  assert.deepEqual(again.map((item) => item.id).sort(), ["old", "repeat"]);
});

test("одно письмо на ученика, текст на «ты» и на «Вы» без подписи в теле", () => {
  const books = new Map([["book-1", "Тихий дом"]]);
  const informal = buildNoteReminderLetter({
    name: "Надежда Yannie_E",
    baseUrl: "https://studio.lizandwriter.ru",
    bookTitles: books,
    notes: [
      { anchorLabel: "Сеттинг", anchorUrl: "/dashboard/setting?book=book-1" },
      { anchorLabel: "Сеттинг", anchorUrl: "/dashboard/setting?book=book-1" },
      { anchorLabel: "О книге", anchorUrl: "/student-view/abc/about" },
    ],
  });
  assert.equal(informal.subject, "Открытые заметки");
  assert.match(informal.text, /Привет, Надя!/);
  assert.equal(informal.text.includes("Yannie_E"), false);
  assert.equal(informal.text.includes("Надежда"), false);
  assert.match(informal.text, /У тебя 3 заметки наставника, которые открыты больше двух недель\./);
  assert.match(informal.text, /О книге: 1 заметка: https:\/\/studio\.lizandwriter\.ru\/dashboard\/about/);
  assert.match(informal.text, /«Тихий дом», Сеттинг: 2 заметки: https:\/\/studio\.lizandwriter\.ru\/dashboard\/setting\?book=book-1/);
  assert.match(informal.html, /href="https:\/\/studio\.lizandwriter\.ru\/dashboard\/about"/);
  assert.match(informal.html, /href="https:\/\/studio\.lizandwriter\.ru\/dashboard\/setting\?book=book-1"/);
  assert.equal(informal.html.includes("student-view"), false);
  assert.match(informal.text, /Посмотри их и закрой, если они уже не нужны\./);
  assert.equal(informal.text.includes("Отключить его может наставник"), false);
  assert.equal(informal.text.includes("Вы оставили"), false);
  assert.match(informal.text, /https:\/\/studio\.lizandwriter\.ru\/dashboard\/tasks#notes/);
  assert.match(informal.text, /Лиза Андреенко/);
  assert.equal(informal.text.split("Лиза Андреенко")[0].includes("Лиза"), false);
  assert.equal(/\bВы\b/.test(informal.text.split("Лиза Андреенко")[0]), false);
  assert.equal(informal.html.includes("fonts.googleapis"), false);

  const formal = buildNoteReminderLetter({
    name: "Виктория",
    baseUrl: "https://studio.lizandwriter.ru",
    notes: [{ anchorLabel: "Сеттинг", anchorUrl: "/dashboard/setting" }],
  });
  assert.match(formal.text, /Виктория, здравствуйте\./);
  assert.equal(/(?<![\p{L}])Вика(?![\p{L}])/u.test(formal.text), false);
  assert.equal(formal.text.includes("Привет"), false);
  assert.match(formal.text, /У Вас 1 заметка наставника, которая открыта больше двух недель\./);
  assert.match(formal.text, /Сеттинг: 1 заметка: https:\/\/studio\.lizandwriter\.ru\/dashboard\/setting/);
  assert.match(formal.text, /Посмотрите её и закройте, если она уже не нужна\./);
  assert.match(formal.html, /Лиза Андреенко/);
  assert.equal(formal.text.includes("Вы оставили"), false);
  assert.equal(formal.text.includes("Отключить его может наставник"), false);
  assert.equal(formal.text.split("Лиза Андреенко")[0].includes("Лиза"), false);

  const link = "https://studio.example/unsubscribe?token=notes";
  const withLink = buildNoteReminderLetter({
    name: "Виктория",
    baseUrl: "https://studio.lizandwriter.ru",
    notes: [{ anchorLabel: "Сеттинг", anchorUrl: "/dashboard/setting" }],
    unsubscribeUrl: link,
  });
  assert.equal(withLink.html.split("token=notes").length - 1, 1);
  assert.equal(withLink.text.split("token=notes").length - 1, 1);
  assert.match(withLink.html, /Отписаться от писем/);
  assert.equal(withLink.html.includes("Отключить его может наставник"), false);

  assert.equal(noteWord(1), "заметка");
  assert.equal(noteWord(3), "заметки");
  assert.equal(noteWord(5), "заметок");
  assert.equal(noteWord(11), "заметок");
  assert.equal(noteWord(21), "заметка");
  assert.equal(noteCountSentence("Надежда", 5), "У тебя 5 заметок наставника, которые открыты больше двух недель.");
  assert.equal(noteCountSentence("Виктория", 21), "У Вас 21 заметка наставника, которая открыта больше двух недель.");
  assert.equal(noteCountSentence("Виктория", 2), "У Вас 2 заметки наставника, которые открыты больше двух недель.");
});

test("выключенная рассылка никого не берёт, превью показывает тех, кому ушло бы", () => {
  const setting = defaultBroadcast("note-reminder");
  const students = [student({ id: "n", name: "Надежда" }), student({ id: "v", name: "Виктория" })];
  const notes = [
    note({ id: "a", studentId: "n", anchorLabel: "Сеттинг", anchorUrl: "/dashboard/setting" }),
    note({ id: "b", studentId: "v", anchorLabel: "О книге", anchorUrl: "/dashboard/about" }),
    note({ id: "c", studentId: "v", anchorLabel: "О книге", anchorUrl: "/dashboard/about" }),
  ];
  const quiet = planNoteReminders({ now, setting, students, notes, sends: [], baseUrl: "https://studio.example" });
  assert.equal(quiet.skipped, "disabled");
  assert.equal(quiet.plans.length, 0);
  const preview = planNoteReminders({
    now,
    setting,
    students,
    notes,
    sends: [],
    baseUrl: "https://studio.example",
    ignoreSchedule: true,
  });
  assert.deepEqual(preview.plans.map((item) => item.student.name), ["Виктория", "Надежда"]);
  assert.equal(preview.plans[0].notes.length, 2);
  assert.match(preview.plans[0].letter.text, /У Вас 2 заметки наставника, которые открыты больше двух недель/);
  assert.match(preview.plans[0].letter.text, /О книге: 2 заметки: https:\/\/studio\.example\/dashboard\/about/);
  assert.match(preview.plans[1].letter.text, /Привет, Надя!/);
});

test("повторная отправка тех же заметок ждёт неделю и пишет журнал только после успеха", async () => {
  const setting = { ...defaultBroadcast("note-reminder"), enabled: true, hour: null };
  const students = [student({ id: "n", name: "Надежда" })];
  const notes = [
    note({ id: "a", studentId: "n" }),
    note({ id: "b", studentId: "n", anchorUrl: "/dashboard/about", anchorLabel: "О книге" }),
  ];
  const sent: string[] = [];
  const recorded: string[][] = [];
  const first = await deliverNoteReminders({
    now,
    setting,
    students,
    notes,
    sends: [],
    baseUrl: "https://studio.example",
    send: async (input) => {
      sent.push(input.to);
      assert.equal(input.type, "note-reminder");
      assert.equal(input.listUnsubscribe, "https://studio.example/unsubscribe?token=n");
      assert.equal(input.text.split("token=n").length - 1, 1);
      return true;
    },
    unsubscribeUrl: (id) => `https://studio.example/unsubscribe?token=${id}`,
    record: async (_studentId, noteIds) => {
      recorded.push(noteIds);
    },
  });
  assert.equal(first.planned, 1);
  assert.equal(first.sent, 1);
  assert.deepEqual(sent, ["n@example.com"]);
  assert.equal(recorded.length, 1);
  assert.deepEqual(recorded[0].sort(), ["a", "b"]);

  const weekLater = new Date(now.getTime() + NOTE_REMINDER_GAP_MS);
  const held = await deliverNoteReminders({
    now: new Date(now.getTime() + 60_000),
    setting,
    students,
    notes,
    sends: recorded[0].map((noteId) => ({ noteId, sentAt: now })),
    baseUrl: "https://studio.example",
    send: async () => {
      throw new Error("не должно отправиться");
    },
    record: async () => {
      throw new Error("не должно записаться");
    },
  });
  assert.equal(held.planned, 0);
  assert.equal(held.alreadySent, 2);

  const again = await deliverNoteReminders({
    now: weekLater,
    setting,
    students,
    notes,
    sends: recorded[0].map((noteId) => ({ noteId, sentAt: now })),
    baseUrl: "https://studio.example",
    send: async () => false,
    record: async () => {
      throw new Error("сбой отправки не пишется в журнал");
    },
  });
  assert.equal(again.planned, 1);
  assert.equal(again.failed, 1);
  assert.equal(again.sent, 0);
});
