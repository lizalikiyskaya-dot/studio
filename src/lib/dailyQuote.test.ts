import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../scripts/sql-guard.mjs";
import { DAILY_QUOTES, DAILY_QUOTE_CATALOG } from "@/data/dailyQuotes";
import { spaceQuotesByAuthor } from "@/data/spaceQuotes";
import { quoteForDate, reanchorAfterEdit, shiftDateKey, shownIndex, type QuoteCursor } from "./dailyQuote";

test("в списке больше шестидесяти разных цитат с автором и источником", () => {
  assert.ok(DAILY_QUOTES.length >= 60);
  const texts = new Set(DAILY_QUOTES.map((quote) => quote.text));
  assert.equal(texts.size, DAILY_QUOTES.length);
  for (const quote of DAILY_QUOTES) {
    assert.ok(quote.text.trim().length > 8);
    assert.ok(quote.author.trim().length > 2);
    assert.ok(quote.source.trim().length > 2);
    assert.equal(quote.source.includes("перевод"), false);
    assert.equal(quote.author.includes("перевод"), false);
  }
  const hemingway = DAILY_QUOTES.find((quote) => quote.author === "Эрнест Хемингуэй");
  assert.equal(hemingway?.source, "«Смерть после полудня», 1932");
  assert.equal(hemingway?.translator, "В. Топер");
  const king = DAILY_QUOTES.find((quote) => quote.author === "Стивен Кинг");
  assert.equal(king?.source, "«Как писать книги»");
  assert.equal(king?.translator, "М. Левина");
});

test("сид цитат совпадает со списком и не стирает правки", () => {
  const oldSql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-10-20-daily-quotes.sql"), "utf8");
  const orderSql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-10-26-9-daily-quote-order.sql"), "utf8");
  assert.equal(findDestructive(oldSql).length, 0);
  assert.equal(findDestructive(orderSql).length, 0);
  assert.equal(oldSql.includes("ON CONFLICT (\"id\") DO NOTHING"), true);
  assert.equal(orderSql.includes("ON CONFLICT (\"id\") DO NOTHING"), true);
  const oldIds = oldSql.match(/quote-\d{3}/g) ?? [];
  assert.equal(oldIds.length, 63);
  assert.equal(oldSql.includes(DAILY_QUOTE_CATALOG[0].text), true);
  assert.equal(oldSql.includes("«Смерть после полудня», 1932"), true);
  assert.equal(oldSql.includes("«Как писать книги»"), true);
  for (const quote of DAILY_QUOTE_CATALOG) {
    assert.equal(oldSql.includes(quote.text) || orderSql.includes(quote.text), true, quote.author);
  }
  for (const [index, quote] of DAILY_QUOTES.entries()) {
    const id = `quote-${String(DAILY_QUOTE_CATALOG.indexOf(quote) + 1).padStart(3, "0")}`;
    assert.equal(orderSql.includes(`'${id}', ${index + 1}`), true, id);
  }
});

test("в один московский день цитата одна и та же", () => {
  const morning = new Date("2026-10-19T00:30:00+03:00");
  const evening = new Date("2026-10-19T23:30:00+03:00");
  const next = new Date("2026-10-20T00:30:00+03:00");
  assert.equal(quoteForDate(morning).text, quoteForDate(evening).text);
  assert.equal(quoteForDate(morning).author, quoteForDate(evening).author);
  assert.notEqual(quoteForDate(morning).text, quoteForDate(next).text);
});

test("очередь начинается с первой цитаты 20 октября 2026", () => {
  const ids = DAILY_QUOTES.map((_, index) => String(index));
  assert.equal(shownIndex(ids, null, "2026-10-20"), 0);
  assert.equal(shownIndex(ids, null, "2026-10-22"), 2);
  const day = quoteForDate(new Date("2026-10-22T12:00:00+03:00"));
  assert.equal(day.text, DAILY_QUOTES[2].text);
  assert.equal(day.author, DAILY_QUOTES[2].author);
  assert.notEqual(DAILY_QUOTES[0].author, DAILY_QUOTES[1].author);
  assert.ok(DAILY_QUOTES.some((quote) => quote.text === "Краткость — сестра таланта." && quote.author === "Антон Чехов"));
});

test("соседние дни не делят автора, кабинет и письмо берут одну строку", () => {
  const mail = fs.readFileSync(path.join(process.cwd(), "src/lib/contentMailRun.ts"), "utf8");
  const cabinet = fs.readFileSync(path.join(process.cwd(), "src/app/dashboard/layout.tsx"), "utf8");
  const loader = fs.readFileSync(path.join(process.cwd(), "src/lib/loadDailyQuote.ts"), "utf8");
  assert.match(mail, /loadDailyQuote/);
  assert.match(cabinet, /loadDailyQuote/);
  assert.match(loader, /shownIndex/);

  const spaced = spaceQuotesByAuthor(DAILY_QUOTE_CATALOG);
  assert.deepEqual(spaced, DAILY_QUOTES);

  const ids = DAILY_QUOTES.map((_, index) => String(index));
  let previous = "";
  for (let day = 0; day < 365; day++) {
    const key = shiftDateKey("2026-10-26", day);
    const morning = quoteForDate(new Date(`${key}T08:00:00+03:00`));
    const evening = quoteForDate(new Date(`${key}T21:00:00+03:00`));
    assert.equal(morning.text, evening.text);
    assert.equal(morning.author, evening.author);
    assert.equal(morning.text, DAILY_QUOTES[shownIndex(ids, null, key)].text);
    if (previous) assert.notEqual(morning.author, previous, key);
    previous = morning.author;
  }

  const count = DAILY_QUOTES.length;
  for (let index = 0; index < count; index++) {
    for (let gap = 1; gap < 7; gap++) {
      assert.notEqual(DAILY_QUOTES[index].author, DAILY_QUOTES[(index + gap) % count].author);
    }
  }
});

test("следующий день берёт следующую строку и замыкает список", () => {
  const ids = ["a", "b", "c"];
  const pin: QuoteCursor = { date: "2026-10-22", quoteId: "b" };
  assert.equal(shownIndex(ids, pin, "2026-10-22"), 1);
  assert.equal(shownIndex(ids, pin, "2026-10-23"), 2);
  assert.equal(shownIndex(ids, { date: "2026-10-22", quoteId: "c" }, "2026-10-23"), 0);
});

test("правка списка не перескакивает уже выбранный день", () => {
  const today = "2026-10-22";
  const ids = ["a", "b", "c", "d"];
  const pin = reanchorAfterEdit(ids, ids, null, today);
  assert.equal(pin?.quoteId, "c");

  const added = reanchorAfterEdit(ids, ["a", "b", "c", "d", "e"], pin, today);
  assert.equal(added?.quoteId, "c");
  assert.equal(shownIndex(["a", "b", "c", "d", "e"], added, shiftDateKey(today, 1)), 3);

  const reordered = ["d", "a", "b", "c"];
  const moved = reanchorAfterEdit(["a", "b", "c", "d", "e"], reordered, added, today);
  assert.equal(moved?.quoteId, "c");
  assert.equal(shownIndex(reordered, moved, shiftDateKey(today, 1)), 0);

  const removed = reanchorAfterEdit(reordered, ["d", "a", "b"], moved, today);
  assert.equal(removed?.quoteId, "d");
  assert.equal(shownIndex(["d", "a", "b"], removed, today), 0);
});
