import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import {
  buildPaymentReminder,
  daysInMonth,
  effectivePaymentDay,
  isDue,
  isMorning,
  moscowParts,
  reminderCopyHasGenderedForms,
  runPaymentReminders,
  type ReminderPerson,
} from "./paymentReminders";

function person(overrides: Partial<ReminderPerson> = {}): ReminderPerson {
  return {
    id: "s1",
    name: "Саша",
    email: "sasha@example.com",
    role: "STUDENT",
    status: "APPROVED",
    paymentDay: 19,
    paymentAmount: 3500,
    paymentReminders: true,
    emailNotifications: true,
    ...overrides,
  };
}

/** 09:30 Москвы = 06:30 UTC, без перехода на летнее время. */
function moscowMorning(isoDay: string, hour = 9, minute = 30): Date {
  const [year, month, day] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute));
}

test("moscow morning window and last day of a short month", () => {
  const morning = moscowParts(moscowMorning("2026-10-19", 9, 5));
  assert.equal(morning.day, 19);
  assert.equal(morning.hour, 9);
  assert.equal(isMorning(morning), true);
  assert.equal(isMorning(moscowParts(moscowMorning("2026-10-19", 8, 59))), false);
  assert.equal(isMorning(moscowParts(moscowMorning("2026-10-19", 12, 0))), false);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(effectivePaymentDay(31, 2026, 4), 30);
  assert.equal(effectivePaymentDay(31, 2026, 3), 31);
  assert.equal(effectivePaymentDay(29, 2026, 2), 28);
});

test("only an approved person with a payment day is due", () => {
  const parts = moscowParts(moscowMorning("2026-04-30"));
  assert.equal(isDue(person({ paymentDay: 31 }), parts), true);
  assert.equal(isDue(person({ paymentDay: 30 }), parts), true);
  assert.equal(isDue(person({ paymentDay: 29 }), parts), false);
  assert.equal(isDue(person({ paymentDay: null }), parts), false);
  assert.equal(isDue(person({ paymentReminders: false, paymentDay: 30 }), parts), false);
  assert.equal(isDue(person({ emailNotifications: false, paymentDay: 30 }), parts), false);
  assert.equal(isDue(person({ status: "SUSPENDED", paymentDay: 30 }), parts), false);
  assert.equal(isDue(person({ role: "MENTOR", paymentDay: 30 }), parts), false);
});

test("letter has no gendered forms and includes the amount only when it is set", () => {
  const parts = moscowParts(moscowMorning("2026-10-19"));
  const withAmount = buildPaymentReminder({ name: "Саша", paymentAmount: 3500 }, parts);
  const without = buildPaymentReminder({ name: "Саша", paymentAmount: null }, parts);
  assert.equal(withAmount.subject, "Сегодня день оплаты");
  assert.equal(reminderCopyHasGenderedForms(withAmount.subject + withAmount.html).join(","), "");
  assert.match(withAmount.html, /3[\s\u00a0]500 ₽/);
  assert.equal(without.html.includes("₽"), false);
  assert.match(withAmount.html, /Саша, сегодня/);
  assert.match(withAmount.html, /напишите мне в Телеграме/);
  assert.match(withAmount.text, /напишите мне в Телеграме/);
  assert.match(withAmount.text, /Лиза Андреенко/);
  assert.equal(withAmount.html.includes("Закладка"), false);
  assert.equal(withAmount.html.includes("ответьте на это письмо"), false);
});

test("dry-run does not claim or send, and a second claim is one letter", async () => {
  const sent: string[] = [];
  const claimed = new Set<string>();
  let claims = 0;
  let sends = 0;
  const list = async () => [person(), person({ id: "s2", paymentDay: null, email: "other@example.com" })];
  const dry = await runPaymentReminders({
    now: moscowMorning("2026-10-19"),
    dryRun: true,
    list,
    claim: async () => {
      claims += 1;
      return true;
    },
    release: async () => {},
    send: async () => {
      sends += 1;
      return true;
    },
  });
  assert.equal(dry.dryRun, true);
  assert.equal(dry.sent, 1);
  assert.equal(claims, 0);
  assert.equal(sends, 0);

  const first = await runPaymentReminders({
    now: moscowMorning("2026-10-19"),
    list,
    claim: async (id, dueOn) => {
      const key = `${id}:${dueOn}`;
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    release: async (id, dueOn) => {
      claimed.delete(`${id}:${dueOn}`);
    },
    send: async ({ to }) => {
      sent.push(to);
      return true;
    },
  });
  const second = await runPaymentReminders({
    now: moscowMorning("2026-10-19", 10, 0),
    list,
    claim: async (id, dueOn) => !claimed.has(`${id}:${dueOn}`),
    release: async () => {},
    send: async ({ to }) => {
      sent.push(to);
      return true;
    },
  });
  assert.deepEqual(sent, ["sasha@example.com"]);
  assert.equal(first.sent, 1);
  assert.equal(second.alreadySent, 1);
  assert.equal(second.sent, 0);
});

test("outside the morning window nothing is sent unless forced", async () => {
  let sends = 0;
  const evening = await runPaymentReminders({
    now: moscowMorning("2026-10-19", 15, 0),
    list: async () => [person()],
    claim: async () => true,
    release: async () => {},
    send: async () => {
      sends += 1;
      return true;
    },
  });
  assert.equal(evening.skipped, "not-morning");
  assert.equal(sends, 0);
});

test("payment reminder SQL is additive", () => {
  const file = path.join(process.cwd(), "docs/sql/2026-10-19-payment-reminders.sql");
  const sql = fs.readFileSync(file, "utf8");
  assert.deepEqual(findDestructive(sql), []);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "paymentAmount"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "paymentReminders"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "PaymentReminderLog"/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS/);
});
