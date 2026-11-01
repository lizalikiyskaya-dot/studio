import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import { EMAIL_SIGNATURE } from "./mail";
import { customMailLetter } from "./customMail";
import { deliverCustomMail } from "./customMailRun";
import {
  customEligible,
  customScheduleLabel,
  customSlot,
  parseCustomMailing,
  type CustomMailingPlan,
  type CustomMailingRow,
} from "./customMailPlan";

const at = new Date("2026-11-02T06:15:00.000Z");

function plan(partial: Partial<CustomMailingPlan> = {}): CustomMailingPlan {
  return {
    name: "Сбор",
    subject: "Тема",
    body: "Текст",
    enabled: true,
    cadence: "once",
    runOn: "2026-11-02",
    weekday: 1,
    monthDay: 2,
    hour: 9,
    minute: 0,
    audience: "all",
    studentIds: "",
    ...partial,
  };
}

test("новая форма требует название, тему, текст и дату", () => {
  assert.equal(parseCustomMailing(plan({ name: "  " })).ok, false);
  assert.equal(parseCustomMailing(plan({ subject: "" })).ok, false);
  assert.equal(parseCustomMailing(plan({ body: "" })).ok, false);
  const missingDate = parseCustomMailing(plan({ runOn: "" }));
  assert.equal(missingDate.ok, false);
  if (!missingDate.ok) assert.equal(missingDate.error, "Выберите дату.");
  const chosen = parseCustomMailing(plan({ audience: "chosen", studentIds: "" }));
  assert.equal(chosen.ok, false);
  if (!chosen.ok) assert.equal(chosen.error, "Выберите хотя бы одного ученика.");
});

test("рассылка выключена, пока её не включили, и уходит только в своё окно", () => {
  assert.equal(customSlot(plan({ enabled: false }), at), null);
  assert.equal(customSlot(plan(), at), "2026-11-02");
  assert.equal(customSlot(plan({ runOn: "2026-11-03" }), at), null);
  assert.equal(customSlot(plan({ cadence: "weekly", weekday: 1 }), at), "2026-11-02");
  assert.equal(customSlot(plan({ cadence: "weekly", weekday: 6 }), at), null);
  assert.equal(customSlot(plan({ cadence: "monthly", monthDay: 2 }), at), "2026-11");
  assert.equal(customSlot(plan({ cadence: "monthly", monthDay: 3 }), at), null);
  assert.equal(customSlot(plan(), new Date("2026-11-02T05:00:00.000Z")), null);
});

test("подпись и отписка ставятся сами, имя подставляется", () => {
  const letter = customMailLetter({
    name: "Надежда",
    subject: "Письмо для {имя}",
    body: "{имя}, это короткое письмо.\n\nДо встречи.",
    unsubscribeUrl: "https://studio.example/unsubscribe?token=mail",
  });
  assert.equal(letter.subject, "Письмо для Надя");
  assert.match(letter.html, new RegExp(EMAIL_SIGNATURE));
  assert.match(letter.text, new RegExp(EMAIL_SIGNATURE));
  assert.match(letter.html, /Отписаться от писем/);
  assert.match(letter.html, /Надя, это короткое письмо/);
  assert.equal(letter.html.includes("—"), false);
});

test("отписавшийся и чужой ученик письмо не получают", () => {
  const row = plan({ audience: "chosen", studentIds: "a" });
  assert.equal(customEligible({ id: "a", status: "APPROVED", email: "a@example.com", emailNotifications: true }, row), true);
  assert.equal(customEligible({ id: "b", status: "APPROVED", email: "b@example.com", emailNotifications: true }, row), false);
  assert.equal(customEligible({ id: "a", status: "APPROVED", email: "a@example.com", emailNotifications: false }, row), false);
});

test("одна и та же дата не уходит второй раз", async () => {
  const row: CustomMailingRow = { id: "m1", ...plan() };
  const sent: string[] = [];
  const result = await deliverCustomMail({
    now: at,
    rows: [row],
    students: [
      { id: "a", name: "Анна", email: "a@example.com", status: "APPROVED", emailNotifications: true },
      { id: "b", name: "Боря", email: "b@example.com", status: "APPROVED", emailNotifications: true },
    ],
    alreadySent: async (_mailingId, studentId) => studentId === "b",
    send: async (input) => {
      sent.push(input.to);
      assert.match(input.html, /data-mail-period="custom:m1:2026-11-02"/);
      assert.match(input.html, new RegExp(EMAIL_SIGNATURE));
      assert.equal(input.listUnsubscribe, "https://studio.example/unsubscribe?token=a");
      return true;
    },
    unsubscribeUrl: (studentId) => `https://studio.example/unsubscribe?token=${studentId}`,
  });
  assert.deepEqual(sent, ["a@example.com"]);
  assert.equal(result.sent, 1);
});

test("в подписях срока нет длинного тире", () => {
  const labels = [
    customScheduleLabel(plan()),
    customScheduleLabel(plan({ cadence: "weekly", weekday: 6 })),
    customScheduleLabel(plan({ cadence: "monthly", monthDay: 5 })),
  ];
  for (const label of labels) assert.equal(label.includes("—"), false);
  assert.match(labels[1], /по субботам/);
  assert.match(labels[2], /5-е число/);
});

test("sql своей рассылки только добавляет таблицу", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-11-01-custom-mailing.sql"), "utf8");
  assert.deepEqual(findDestructive(sql), []);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "CustomMailing"/);
  assert.match(sql, /"enabled" BOOLEAN NOT NULL DEFAULT false/);
});
