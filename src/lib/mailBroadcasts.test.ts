import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import { flushDigests } from "./activityDigest";
import { activityLetterSamples, mentorWorkLetter, studentOnlineLetter, studentWorkLetter } from "./activityLetters";
import {
  clockOpen,
  defaultBroadcast,
  groupsReady,
  isSessionStart,
  mergeDetail,
  sameCalendarDay,
  scheduleLabel,
  zonedClock,
  type DigestRow,
} from "./mailBroadcasts";

function row(partial: Partial<DigestRow> & Pick<DigestRow, "id" | "studentId" | "createdAt">): DigestRow {
  return {
    kind: "student-edit",
    section: "tasks",
    detail: "Правка",
    sentAt: null,
    ...partial,
  };
}

test("день оплаты по умолчанию как утреннее окно Москвы, правки выключены", () => {
  const payment = defaultBroadcast("payment");
  assert.equal(payment.enabled, true);
  assert.equal(payment.hour, 9);
  assert.equal(payment.windowMinutes, 180);
  assert.equal(payment.timeZone, "Europe/Moscow");
  const morning = zonedClock(new Date("2026-10-20T07:30:00Z"), "Europe/Moscow");
  assert.equal(clockOpen(morning, payment), true);
  const noon = zonedClock(new Date("2026-10-20T09:00:00Z"), "Europe/Moscow");
  assert.equal(clockOpen(noon, payment), false);
  assert.equal(defaultBroadcast("mentor-edit").enabled, false);
  assert.equal(defaultBroadcast("student-edit").enabled, false);
  assert.equal(defaultBroadcast("student-online").enabled, false);
  assert.equal(defaultBroadcast("submitted").enabled, true);
  assert.equal(defaultBroadcast("student-online").oncePerDay, true);
  assert.equal(defaultBroadcast("guide").enabled, true);
});

test("пачка ждёт окно и склеивает одну строку на раздел", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const fresh = row({ id: "a", studentId: "s", createdAt: new Date("2026-10-20T11:30:00Z") });
  assert.equal(groupsReady([fresh], now, 60).length, 0);
  const due = row({ id: "b", studentId: "s", createdAt: new Date("2026-10-20T10:00:00Z"), section: "setting" });
  const groups = groupsReady([fresh, due], now, 60);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 2);
  assert.equal(mergeDetail("Предложение", "Предложение"), "Предложение");
  assert.equal(mergeDetail("Предложение", "Комментарий"), "Предложение; Комментарий");
});

test("визит: новый заход после паузы и одни сутки по Москве", () => {
  const now = new Date("2026-10-20T07:00:00Z");
  assert.equal(isSessionStart(null, now), true);
  assert.equal(isSessionStart(new Date("2026-10-20T06:50:00Z"), now), false);
  assert.equal(isSessionStart(new Date("2026-10-20T06:00:00Z"), now), true);
  assert.equal(sameCalendarDay(new Date("2026-10-20T00:30:00Z"), now, "Europe/Moscow"), true);
  assert.equal(sameCalendarDay(new Date("2026-10-19T20:30:00Z"), now, "Europe/Moscow"), false);
  const seoul = zonedClock(now, "Asia/Seoul");
  assert.equal(seoul.hour, 16);
});

test("письма о правках в той же оболочке и без тире", () => {
  const samples = activityLetterSamples();
  assert.match(samples["mentor-edit"].letter.html, /Наставник внёс правку/);
  assert.match(samples["mentor-edit"].letter.html, /Принято/);
  assert.match(samples["mentor-edit"].letter.html, /На доработке/);
  assert.match(samples["mentor-edit"].letter.html, /Заметки/);
  assert.match(samples["mentor-edit"].letter.html, /Правки/);
  assert.match(samples["mentor-edit"].letter.html, /Отзыв/);
  assert.match(samples["mentor-edit"].letter.text, /в Ваш кабинет/);
  assert.match(samples["mentor-edit"].letter.html, /#task-1/);
  assert.match(samples["mentor-edit"].letter.html, /Лиза Андреенко/);
  assert.match(samples["mentor-edit"].letter.html, /Андреенко/);
  assert.equal(samples["mentor-edit"].letter.html.includes("—"), false);
  assert.match(samples["student-edit"].letter.text, /Виктория: в кабинете есть новые правки/);
  assert.match(samples["student-edit"].letter.html, /Предложение/);
  assert.match(studentOnlineLetter({ name: "Виктория", studentId: "s", when: "20 октября, Москва" }).text, /Виктория в кабинете/);
  assert.match(mentorWorkLetter({ name: "Виктория", studentId: "s", pieces: [{ section: "tasks", detail: "Предложение" }] }).html, /dashboard\/tasks/);
  assert.match(studentWorkLetter({ name: "Виктория", studentId: "s1", pieces: [{ section: "setting", detail: "Заметка" }] }).html, /student-view\/s1\/setting/);
  assert.match(scheduleLabel(defaultBroadcast("payment"), "clock"), /Москва/);
});

test("пачка шлёт одно письмо через подставленную отправку и молчит, если выключена", async () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const sent: string[] = [];
  const due = row({ id: "due", studentId: "s", createdAt: new Date("2026-10-20T10:00:00Z") });
  const fresh = row({ id: "fresh", studentId: "other", createdAt: new Date("2026-10-20T11:50:00Z") });
  const result = await flushDigests({
    now,
    settings: async (key) => (key === "student-edit" ? { ...defaultBroadcast("student-edit"), enabled: true, windowMinutes: 60 } : { ...defaultBroadcast(key), enabled: false }),
    list: async () => [due, fresh],
    markSent: async (ids) => { sent.push(...ids); },
    student: async (id) => ({ id, name: "Виктория", email: "v@example.com", status: "APPROVED", emailNotifications: true }),
    mentor: async () => ({ id: "m", name: "Лиза", email: "liza@example.com", status: "APPROVED", emailNotifications: true }),
    send: async (input) => {
      sent.push(`to:${input.to}`);
      return true;
    },
    envelope: async () => ({ from: "Сервер <server@example.com>" }),
  });
  assert.equal(result.sent, 1);
  assert.equal(sent.includes("due"), true);
  assert.equal(sent.includes("fresh"), false);
  assert.equal(sent.includes("to:liza@example.com"), true);
});

test("таблицы рассылок только добавляются и без пароля", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-10-20-mail-broadcast.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "MailBroadcast"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "MailDigest"/);
  assert.equal(sql.toLowerCase().includes("password"), false);
  assert.deepEqual(findDestructive(sql), []);
});
