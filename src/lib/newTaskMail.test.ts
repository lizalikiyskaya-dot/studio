import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { greetingName } from "./addressForm";
import { defaultBroadcast } from "./mailBroadcasts";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import { listUnsubscribeHeaders } from "./mail";
import { newTaskDeadlineLine, newTaskGreeting, newTaskLetter, newTaskUrl, shouldSendNewTaskMail, withLizaFrom } from "./newTaskMail";

test("приветствие: Надя, Виктория и без логина", () => {
  assert.equal(greetingName("Надежда"), "Надя");
  assert.equal(greetingName("Виктория Петрова"), "Виктория");
  assert.equal(greetingName("Ян Yannie_E"), "Ян");
  assert.equal(greetingName("Yannie_E"), "");
  assert.equal(newTaskGreeting("Надежда"), "Надя, у тебя новое задание.");
  assert.equal(newTaskGreeting("Виктория"), "Виктория, у Вас новое задание.");
  assert.equal(newTaskGreeting("Yannie_E"), "У тебя новое задание.");
});

test("письмо один раз, когда наставник впервые называет задание", () => {
  assert.equal(shouldSendNewTaskMail("MENTOR", "", "Черновик первой главы", false), true);
  assert.equal(shouldSendNewTaskMail("MENTOR", "   ", "Черновик первой главы", false), true);
  assert.equal(shouldSendNewTaskMail("STUDENT", "", "Черновик первой главы", false), false);
  assert.equal(shouldSendNewTaskMail("MENTOR", "Черновик", "Другое название", false), false);
  assert.equal(shouldSendNewTaskMail("MENTOR", "", "Черновик первой главы", true), false);
  assert.equal(shouldSendNewTaskMail("MENTOR", "", "   ", false), false);
});

test("письмо ученику: название, срок, ссылка в кабинет, одна отписка", () => {
  const url = newTaskUrl("task-1");
  assert.match(url, /\/dashboard\/tasks#task-task-1$/);
  const letter = newTaskLetter({
    name: "Надежда Yannie_E",
    title: "Черновик первой главы",
    deadline: new Date("2026-11-02T00:00:00Z"),
    taskId: "task-1",
    unsubscribeUrl: "https://studio.example/unsubscribe?token=mail",
  });
  assert.equal(letter.subject, "Новое задание: Черновик первой главы");
  assert.match(letter.text, /Надя, у тебя новое задание\./);
  assert.equal(letter.text.includes("Надежда"), false);
  assert.equal(letter.text.includes("Yannie_E"), false);
  assert.match(letter.text, /Черновик первой главы/);
  assert.match(letter.text, /Срок — 2 ноября\./);
  assert.match(letter.text, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(letter.text, /https:\/\/studio\.example\/unsubscribe\?token=mail/);
  assert.equal(letter.html.split("Отписаться от писем").length - 1, 1);
  assert.equal(letter.html.includes("fonts.googleapis"), false);
  assert.equal(letter.html.includes("Onest"), false);
  assert.match(letter.html, /display:none[^>]*>Надя, у тебя новое задание\./);
  assert.match(letter.html, /Открыть задание/);
  const formal = newTaskLetter({
    name: "Виктория",
    title: "Сцена в кафе",
    deadline: null,
    taskId: "task-2",
  });
  assert.match(formal.text, /Виктория, у Вас новое задание\./);
  assert.equal(formal.text.includes("Срок"), false);
  assert.equal(formal.html.includes("Отписаться"), false);
  assert.equal(newTaskDeadlineLine(null), null);
});

test("отписка почтового клиента — одно нажатие, имя отправителя Лиза", () => {
  const headers = listUnsubscribeHeaders("https://studio.example/unsubscribe?token=abc");
  assert.equal(headers["List-Unsubscribe"], "<https://studio.example/api/unsubscribe?token=abc>");
  assert.equal(headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.equal(withLizaFrom("Студия художественной прозы <liza@example.com>"), "Лиза Андреенко <liza@example.com>");
});

test("тумблер включён, в пачку правок письмо не встаёт, столбец только добавляется", () => {
  assert.equal(defaultBroadcast("new-task").enabled, true);
  const actions = fs.readFileSync(path.join(process.cwd(), "src/features/tasks/actions.ts"), "utf8");
  assert.equal(actions.includes("queueCabinetChange"), false);
  assert.equal(actions.includes("notifyStudentOfMentorEdit"), false);
  assert.match(actions, /notifyStudentOfNewTask/);
  const tracker = fs.readFileSync(path.join(process.cwd(), "src/features/sectionBeacons/SectionTracker.tsx"), "utf8");
  assert.match(tracker, /data-no-digest/);
  const sql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-10-29-task-assigned-mail.sql"), "utf8");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "assignedMailSent" BOOLEAN NOT NULL DEFAULT true/);
  assert.deepEqual(findDestructive(sql), []);
});
