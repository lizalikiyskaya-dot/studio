import assert from "node:assert/strict";
import test from "node:test";
import { flushDigests, nextDigestDetail } from "./activityDigest";
import { mentorDigestGroups, mentorWorkLetter } from "./activityLetters";
import { defaultBroadcast, type DigestRow } from "./mailBroadcasts";
import {
  isMentorTextModel,
  mentorDigestLine,
  mentorTextLineTitle,
  reviewGroup,
  studentExerciseUrl,
  studentTaskUrl,
  textModelUrl,
} from "./mentorDigest";

test("группы письма идут в одном порядке и не теряют старые строки", () => {
  const groups = mentorDigestGroups([
    { section: "feedback:task:1", detail: "Отзыв к главе\thttps://studio.example/dashboard/tasks#task-1" },
    { section: "text:PlanChapter:3", detail: "Глава: Третья\thttps://studio.example/dashboard/plan#chapter-3" },
    { section: "accepted:task:1", detail: "Черновик\thttps://studio.example/dashboard/tasks?tab=accepted#task-1" },
    { section: "note:n1", detail: "Посмотри сцену\thttps://studio.example/dashboard/tasks" },
    { section: "revision:story:2", detail: "Рассказ\thttps://studio.example/dashboard/stories#story-2" },
    { section: "accepted:task:1", detail: "Черновик\thttps://studio.example/dashboard/tasks?tab=accepted#task-1" },
    { section: "tasks", detail: "Предложение" },
  ]);
  assert.deepEqual(groups.map((group) => group.title), ["Принято", "На доработке", "Заметки", "Правки", "Отзыв", "tasks"]);
  assert.equal(groups[0].items.length, 1);
  assert.equal(groups[5].items[0], "Предложение");
});

test("ссылка на одно место заменяет прошлую строку, обычная правка клеится", () => {
  const first = mentorDigestLine("Черновик", "https://studio.example/dashboard/tasks#task-1");
  const next = mentorDigestLine("Черновик, новая ссылка", "https://studio.example/dashboard/tasks#task-1");
  assert.equal(nextDigestDetail(first, next), next);
  assert.equal(nextDigestDetail("Предложение", "Комментарий"), "Предложение; Комментарий");
  assert.equal(reviewGroup("ACCEPTED"), "accepted");
  assert.equal(reviewGroup("NEEDS_REVISION"), "revision");
  assert.equal(reviewGroup("SUBMITTED"), null);
});

test("письмо называет места и ведёт по ссылке, Виктория на «Вы»", () => {
  const letter = mentorWorkLetter({
    name: "Виктория",
    studentId: "s",
    pieces: [
      { section: "accepted:task:1", detail: mentorDigestLine("Черновик", studentTaskUrl("1", "accepted")) },
      { section: "revision:arc:2", detail: mentorDigestLine("Арка", studentExerciseUrl("arc", "2")) },
      { section: "text:GrapesSetting:9", detail: mentorDigestLine(mentorTextLineTitle("GrapesSetting", "Север"), textModelUrl("GrapesSetting", "9")) },
    ],
  });
  assert.match(letter.text, /Виктория, я внесла правки в Ваш кабинет/);
  assert.match(letter.text, /Принято/);
  assert.match(letter.text, /На доработке/);
  assert.match(letter.text, /Правки/);
  assert.match(letter.html, /tab=accepted#task-1/);
  assert.match(letter.html, /focus=arc#exercise-2/);
  assert.match(letter.html, /setting#setting-9/);
  assert.equal(letter.html.includes("—"), false);
  assert.equal(letter.text.includes("—"), false);
  const withLink = mentorWorkLetter({
    name: "Надежда Yannie_E",
    studentId: "s",
    pieces: [{ section: "note:n1", detail: mentorDigestLine("Сцена", "https://studio.example/dashboard/tasks") }],
    unsubscribeUrl: "https://studio.example/unsubscribe?token=mail",
  });
  assert.match(withLink.text, /Надя, я внесла правки в твой кабинет/);
  assert.equal(withLink.text.includes("Yannie_E"), false);
  assert.equal(withLink.text.includes("Надежда"), false);
  assert.equal(withLink.html.split("Отписаться от писем").length - 1, 1);
  assert.equal(withLink.html.includes("в профиле"), false);
  assert.equal(isMentorTextModel("GrapesSetting"), true);
  assert.equal(isMentorTextModel("Character"), false);
  assert.equal(mentorTextLineTitle("Book", "Роман", "grapesGeography"), "Сеттинг: Роман");
  assert.equal(textModelUrl("Book", "b", "title").endsWith("/dashboard/about"), true);
  assert.equal(textModelUrl("Book", "b", "grapesGeography").endsWith("/dashboard/setting"), true);
  assert.equal(defaultBroadcast("mentor-edit").enabled, false);
  assert.equal(defaultBroadcast("mentor-edit").windowMinutes, 60);
});

test("пачка наставника ждёт час и шлёт один список", async () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const sent: { to: string; html: string; text: string }[] = [];
  const due: DigestRow = {
    id: "due",
    kind: "mentor-edit",
    studentId: "s",
    section: "accepted:task:1",
    detail: "Черновик\thttps://studio.example/dashboard/tasks?tab=accepted#task-1",
    createdAt: new Date("2026-10-20T11:20:00Z"),
    sentAt: null,
  };
  const fresh: DigestRow = { ...due, id: "fresh", createdAt: new Date("2026-10-20T11:40:00Z"), section: "note:n", detail: "Заметка\thttps://studio.example/dashboard/tasks" };
  const result = await flushDigests({
    now,
    settings: async (key) => (key === "mentor-edit" ? { ...defaultBroadcast("mentor-edit"), enabled: true, windowMinutes: 60 } : { ...defaultBroadcast(key), enabled: false }),
    list: async (kind) => (kind === "mentor-edit" ? [due, fresh] : []),
    markSent: async () => undefined,
    student: async (id) => ({ id, name: "Надя", email: "n@example.com", status: "APPROVED", emailNotifications: true }),
    mentor: async () => null,
    send: async (input) => {
      sent.push({ to: input.to, html: input.html, text: input.text });
      return true;
    },
    envelope: async () => ({ from: "Сервер <server@example.com>" }),
  });
  assert.equal(result.sent, 0);

  const ready = await flushDigests({
    now,
    settings: async (key) => (key === "mentor-edit" ? { ...defaultBroadcast("mentor-edit"), enabled: true, windowMinutes: 60 } : { ...defaultBroadcast(key), enabled: false }),
    list: async (kind) => (kind === "mentor-edit" ? [{ ...due, createdAt: new Date("2026-10-20T10:00:00Z") }, { ...fresh, createdAt: new Date("2026-10-20T10:05:00Z") }] : []),
    markSent: async () => undefined,
    student: async (id) => ({ id, name: "Надя", email: "n@example.com", status: "APPROVED", emailNotifications: true }),
    mentor: async () => null,
    send: async (input) => {
      sent.push({ to: input.to, html: input.html, text: input.text });
      return true;
    },
    envelope: async () => ({ from: "Сервер <server@example.com>" }),
  });
  assert.equal(ready.sent, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "n@example.com");
  assert.match(sent[0].text, /Надя, я внесла правки в твой кабинет/);
  assert.match(sent[0].text, /Принято/);
  assert.match(sent[0].text, /Заметки/);
  assert.match(sent[0].html, /tab=accepted#task-1/);
});
