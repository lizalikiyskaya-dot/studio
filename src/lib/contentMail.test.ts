import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import { deliverContentMail, sentMarker, wasSent, type ContentStudent } from "./contentMail";
import { contentDue } from "./contentMail";
import { defaultBroadcast, zonedClock } from "./mailBroadcasts";
import { readOptOut, signOptOut } from "./mailOptOut";
import { dailyQuoteLetter, weeklyTaskLetter } from "./notify";

const secret = "test-secret";

function student(partial: Partial<ContentStudent> = {}): ContentStudent {
  return {
    id: "s1",
    name: "Виктория",
    email: "v@example.com",
    status: "APPROVED",
    emailNotifications: true,
    weeklyEmails: true,
    quoteEmails: true,
    ...partial,
  };
}

test("задание недели по субботам в 10:00 Москвы, цитата каждый день в 09:00, оба выключены", () => {
  const weekly = defaultBroadcast("weekly-task");
  const quote = defaultBroadcast("daily-quote");
  assert.equal(weekly.enabled, false);
  assert.equal(quote.enabled, false);
  assert.equal(weekly.weekdays, "6");
  assert.equal(weekly.hour, 10);
  const saturday = new Date("2026-10-24T07:00:00Z");
  const friday = new Date("2026-10-23T07:00:00Z");
  const turnedOn = { ...weekly, enabled: true };
  assert.equal(contentDue(turnedOn, saturday), true);
  assert.equal(contentDue(turnedOn, friday), false);
  assert.equal(contentDue(weekly, saturday), false);
  const morning = new Date("2026-10-20T06:00:00Z");
  const early = new Date("2026-10-20T05:00:00Z");
  const later = new Date("2026-10-20T07:00:00Z");
  const quoteOn = { ...quote, enabled: true };
  assert.equal(zonedClock(morning, "Europe/Moscow").hour, 9);
  assert.equal(contentDue(quoteOn, morning), true);
  assert.equal(contentDue(quoteOn, early), false);
  assert.equal(contentDue(quoteOn, later), false);
  assert.equal(contentDue(quoteOn, saturday), false);
});

test("токен отписки подписывается и не принимает подмену", () => {
  const token = signOptOut("student-1", "weekly", secret);
  assert.deepEqual(readOptOut(token, secret), { userId: "student-1", kind: "weekly" });
  assert.equal(readOptOut(token, "other"), null);
  assert.equal(readOptOut(token.slice(0, -2) + "aa", secret), null);
  assert.equal(readOptOut("not-a-token", secret), null);
  const quote = signOptOut("student-1", "quote", secret);
  assert.equal(readOptOut(quote, secret)?.kind, "quote");
});

test("рассылка шлёт один раз и пропускает отписавшихся", async () => {
  const sent: string[] = [];
  const seen = new Set<string>();
  const weekly = { ...defaultBroadcast("weekly-task"), enabled: true };
  const quote = { ...defaultBroadcast("daily-quote"), enabled: true, hour: 10 };
  const now = new Date("2026-10-24T07:00:00Z");
  const people = [
    student(),
    student({ id: "off", email: "off@example.com", weeklyEmails: false, quoteEmails: false }),
    student({ id: "quiet", email: "quiet@example.com", emailNotifications: false }),
    student({ id: "pending", email: "p@example.com", status: "PENDING" }),
  ];
  const result = await deliverContentMail({
    now,
    weeklySetting: weekly,
    quoteSetting: quote,
    students: people,
    weekly: {
      publishedOn: "2026-10-24",
      letter: (person) => ({
        subject: "Задание недели",
        html: `<p>${person.name}</p><a href="https://example.test">Отписаться от заданий недели</a>`,
        text: person.name,
      }),
    },
    quote: {
      letter: (person) => ({
        subject: "Цитата дня",
        html: `<p>${person.name}</p><a href="https://example.test">Отписаться от цитат дня</a>`,
        text: person.name,
      }),
    },
    alreadySent: async (id, kind, period) => seen.has(`${id}:${kind}:${period}`),
    send: async (input) => {
      sent.push(`${input.type}:${input.to}:${input.listUnsubscribe ?? ""}`);
      assert.equal(wasSent(input.html, input.type, input.type === "weekly-task" ? "2026-10-24" : "2026-10-24"), true);
      assert.match(input.html, /Отписаться/);
      seen.add(`${input.recipientUserId}:${input.type}:${input.type === "weekly-task" ? "2026-10-24" : "2026-10-24"}`);
      return true;
    },
    unsubscribeUrl: (id, kind) => `https://example.test/unsubscribe?token=${signOptOut(id, kind, secret)}`,
  });
  assert.equal(result.weekly, 1);
  assert.equal(result.quote, 1);
  assert.equal(sent.length, 2);
  const again = await deliverContentMail({
    now,
    weeklySetting: weekly,
    quoteSetting: quote,
    students: [student()],
    weekly: { publishedOn: "2026-10-24", letter: () => ({ subject: "Задание недели", html: "<p>x</p>", text: "x" }) },
    quote: null,
    alreadySent: async (id, kind, period) => seen.has(`${id}:${kind}:${period}`),
    send: async () => {
      throw new Error("повтор");
    },
    unsubscribeUrl: () => null,
  });
  assert.equal(again.weekly, 0);
  assert.match(sentMarker("weekly-task", "2026-10-24"), /weekly-task:2026-10-24/);
});

test("в письмах есть своя ссылка отписки", () => {
  const weekly = weeklyTaskLetter({
    name: "Виктория",
    title: "Комната",
    prompt: "Опиши комнату.",
    lengthHint: "",
    publishedOn: "2026-10-24",
    unsubscribeUrl: "https://studio.example/unsubscribe?token=weekly",
  });
  const quote = dailyQuoteLetter({
    name: "Виктория",
    text: "Тишина.",
    author: "Автор",
    unsubscribeUrl: "https://studio.example/unsubscribe?token=quote",
  });
  assert.match(weekly.html, /Отписаться от заданий недели/);
  assert.match(weekly.html, /token=weekly/);
  assert.match(quote.html, /Отписаться от цитат дня/);
  assert.match(quote.text, /https:\/\/studio\.example\/unsubscribe\?token=quote/);
  assert.equal(weekly.html.includes("—"), false);
});

test("отписка только добавляет два столбца и без пароля", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-10-20-mail-optout.sql"), "utf8");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "weeklyEmails" BOOLEAN NOT NULL DEFAULT true/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "quoteEmails" BOOLEAN NOT NULL DEFAULT true/);
  assert.equal(sql.toLowerCase().includes("password"), false);
  assert.deepEqual(findDestructive(sql), []);
});
