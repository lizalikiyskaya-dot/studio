import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import { envelopeFrom, normalizeSender, senderWarning, type SmtpPublic } from "./mailSender";
import { renderMentorCompose, sendInSeries, templateDraft } from "./mentorCompose";

const weekly = {
  title: "Комната после новости",
  prompt: "Опиши комнату.",
  lengthHint: "полстраницы",
  publishedOn: "2026-10-24",
  nextPublishedOn: "2026-10-31",
};
const quote = { text: "Краткость — сестра таланта.", author: "Антон Чехов", source: "Письмо" };
const gmail: SmtpPublic = { host: "smtp.gmail.com", user: "lizalikiyskaya@gmail.com", configured: true };

test("адрес отправителя только добавляет столбцы и не хранит пароль", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-10-20-mail-from.sql"), "utf8");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "mailFromEmail"/);
  assert.equal(sql.toLowerCase().includes("password"), false);
  assert.deepEqual(findDestructive(sql), []);
});

test("чужой адрес на Gmail получает предупреждение, свой нет", () => {
  assert.match(senderWarning({ fromName: "Лиза", fromEmail: "other@example.com", replyTo: "" }, gmail) ?? "", /Gmail/);
  assert.equal(senderWarning({ fromName: "", fromEmail: "lizalikiyskaya@gmail.com", replyTo: "" }, gmail), null);
  assert.ok(normalizeSender({ fromName: "Лиза", fromEmail: "не почта", replyTo: "" }).error);
});

test("сохранённый адрес не подменяет рабочий из окружения", () => {
  const same = envelopeFrom({ fromName: "", fromEmail: "", replyTo: "" }, "Студия <box@example.com>");
  assert.equal(same.from, "Студия <box@example.com>");
  assert.equal(same.replyTo, undefined);
  const custom = envelopeFrom(
    { fromName: "Лиза Андреенко", fromEmail: "liza@example.com", replyTo: "reply@example.com" },
    "Студия <box@example.com>",
  );
  assert.equal(custom.from, "Студия <box@example.com>");
  assert.equal(custom.replyTo, undefined);
});

test("неизменённый шаблон уходит оформленным, правка текста уходит как текст", () => {
  const draft = templateDraft("platform", weekly, quote);
  const designed = renderMentorCompose({
    template: "platform",
    subject: draft.subject,
    body: draft.body,
    name: "Виктория",
    weekly,
    quote,
  });
  assert.equal(designed.type, "platform-update");
  assert.match(designed.html, /Еженедельное задание/);
  assert.match(designed.subject, /Отчёт об обновлениях/);
  assert.match(designed.text, /Виктория/);

  const edited = renderMentorCompose({
    template: "platform",
    subject: "Коротко, {имя}",
    body: "Только одна правка.",
    name: "Виктория",
    weekly,
    quote,
  });
  assert.match(edited.subject, /Коротко, Виктория/);
  assert.match(edited.text, /Только одна правка/);
  assert.equal(edited.html.includes("Еженедельное задание"), false);
});

test("задание недели и цитата подставляют данные кабинета", () => {
  const week = templateDraft("weekly", weekly, quote);
  const letter = renderMentorCompose({
    template: "weekly",
    subject: week.subject,
    body: week.body,
    name: "Виктория",
    weekly,
    quote,
  });
  assert.match(letter.html, /Комната после новости/);
  assert.match(letter.text, /dashboard\/weekly/);
  assert.equal(templateDraft("weekly", null, null).ready, false);

  const day = templateDraft("quote", weekly, quote);
  const quoted = renderMentorCompose({
    template: "quote",
    subject: day.subject,
    body: day.body,
    name: "Виктория",
    weekly,
    quote,
  });
  assert.match(quoted.html, /Антон Чехов/);
  assert.equal(templateDraft("quote", weekly, null).ready, false);
});

test("сохранённый шаблон задания уходит в той же рамке", () => {
  const stored = {
    subject: "Неделя для {имя}",
    body: "{имя}, держите задание этой недели.\n\n{задание}\n\n{текст}\n\n{срок}\n{объём}",
  };
  const loaded = {
    subject: "Неделя для {имя}",
    body: "{имя}, держите задание этой недели.\n\nКомната после новости\n\nОпиши комнату.\n\nОткрыто с 24 октября 2026 г. Сдать до 30 октября 2026 г.\nОбъём: полстраницы",
  };
  const letter = renderMentorCompose({
    template: "weekly",
    subject: loaded.subject,
    body: loaded.body,
    name: "Виктория",
    weekly,
    quote,
    stored,
  });
  assert.equal(letter.subject, "Неделя для Виктория");
  assert.match(letter.html, /border-radius:16px/);
  assert.match(letter.html, /Андреенко/);
  assert.match(letter.html, /Открыть задание/);
  assert.match(letter.html, /Лиза Андреенко/);
  assert.match(letter.text, /Виктория/);
});

test("пачка писем уходит по одному", async () => {
  let active = 0;
  let max = 0;
  const order: number[] = [];
  await sendInSeries([1, 2, 3], 15, async (item) => {
    active += 1;
    max = Math.max(max, active);
    await new Promise((resolve) => setTimeout(resolve, 20));
    active -= 1;
    order.push(item);
  });
  assert.deepEqual(order, [1, 2, 3]);
  assert.equal(max, 1);
});
