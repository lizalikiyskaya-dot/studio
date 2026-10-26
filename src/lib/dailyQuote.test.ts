import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive, statementsToRun } from "../../scripts/sql-guard.mjs";
import {
  DAILY_QUOTES,
  DAILY_QUOTE_CATALOG,
  OPEN_DAILY_QUOTES,
  RETIRED_DAILY_QUOTE_IDS,
  TODAY_NAIPAUL_ID,
  dailyQuoteId,
} from "@/data/dailyQuotes";
import { RETIRED_DAILY_QUOTE_TEXTS } from "@/data/dailyQuoteCuts";
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
  const balanceSql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-10-26-91-daily-quote-balance.sql"), "utf8");
  assert.equal(findDestructive(balanceSql).length, 0);
  const statements = statementsToRun(balanceSql);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /DO \$balance\$/);
  const removedSql = balanceSql.slice(balanceSql.indexOf("DELETE FROM"), balanceSql.indexOf("CREATE TEMP TABLE quote_pref"));
  assert.equal(removedSql.includes("quote-004"), false);
  for (const id of RETIRED_DAILY_QUOTE_IDS) assert.equal(removedSql.includes(`'${id}'`), true, id);
  const prefSql = balanceSql.slice(balanceSql.indexOf("INSERT INTO quote_pref"), balanceSql.indexOf("CREATE TEMP TABLE quote_src"));
  for (const [index, quote] of OPEN_DAILY_QUOTES.entries()) {
    assert.equal(prefSql.includes(`('${dailyQuoteId(quote)}', ${index + 1})`), true, dailyQuoteId(quote));
  }
  assert.match(balanceSql, /"key" = 'quote-seq'/);
  assert.match(balanceSql, /2026-10-26/);
  assert.match(balanceSql, /"quoteId":"quote-004"/);
  assert.match(balanceSql, new RegExp(TODAY_NAIPAUL_ID));
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

  const spaced = spaceQuotesByAuthor(OPEN_DAILY_QUOTES);
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

function authorGapHolds(quotes: readonly { author: string }[]) {
  const count = quotes.length;
  for (let index = 0; index < count; index++) {
    for (let gap = 1; gap < 7; gap++) {
      assert.notEqual(quotes[index].author, quotes[(index + gap) % count].author);
    }
  }
}

test("Льоса и Найпол не доминируют, сегодня Найпол, Чехов quote-004 остаётся", () => {
  assert.equal(RETIRED_DAILY_QUOTE_IDS.length, RETIRED_DAILY_QUOTE_TEXTS.length);
  assert.equal(new Set(RETIRED_DAILY_QUOTE_TEXTS).size, RETIRED_DAILY_QUOTE_TEXTS.length);
  const retiredAuthors = RETIRED_DAILY_QUOTE_IDS.map((id) => DAILY_QUOTE_CATALOG[Number(id.slice(6)) - 1]);
  assert.equal(retiredAuthors.filter((quote) => quote.author === "Марио Варгас Льоса").length, 7);
  assert.equal(retiredAuthors.filter((quote) => quote.author === "В. С. Найпол").length, 4);
  assert.equal(DAILY_QUOTES.filter((quote) => quote.author === "Марио Варгас Льоса").length, 6);
  assert.equal(DAILY_QUOTES.filter((quote) => quote.author === "В. С. Найпол").length, 6);
  assert.equal(OPEN_DAILY_QUOTES.length, 113);
  assert.equal(RETIRED_DAILY_QUOTE_IDS.includes("quote-004"), false);
  assert.equal(RETIRED_DAILY_QUOTE_IDS.includes(TODAY_NAIPAUL_ID), false);

  const chekhov = DAILY_QUOTES.find((quote) => dailyQuoteId(quote) === "quote-004");
  assert.equal(chekhov?.author, "Антон Чехов");
  assert.equal(chekhov?.text, "Не зализывай, не шлифуй, а будь неуклюж и дерзок.");
  const todayQuote = DAILY_QUOTE_CATALOG[Number(TODAY_NAIPAUL_ID.slice(6)) - 1];
  assert.equal(todayQuote.author, "В. С. Найпол");

  authorGapHolds(DAILY_QUOTES);
  const ids = DAILY_QUOTES.map((quote) => dailyQuoteId(quote));
  const pin: QuoteCursor = { date: "2026-10-26", quoteId: TODAY_NAIPAUL_ID };
  let previous = "";
  for (let day = 0; day < 365; day++) {
    const key = shiftDateKey("2026-10-26", day);
    const quote = DAILY_QUOTES[shownIndex(ids, pin, key)];
    if (day === 0) assert.equal(quote.author, "В. С. Найпол");
    if (day === 0) assert.equal(dailyQuoteId(quote), TODAY_NAIPAUL_ID);
    if (previous) assert.notEqual(quote.author, previous, key);
    previous = quote.author;
  }
  assert.notEqual(DAILY_QUOTES[shownIndex(ids, pin, "2026-10-26")].text, chekhov?.text);

  const oldIds = OPEN_DAILY_QUOTES.map((quote) => dailyQuoteId(quote)).filter((id) => Number(id.slice(6)) <= 63);
  assert.equal(oldIds.length, 63);
  const missingSets = [
    ["quote-001", "quote-002", "quote-003", "quote-005", "quote-006"],
    ["quote-010", "quote-011", "quote-012", "quote-013", "quote-014"],
    ["quote-059", "quote-060", "quote-061", "quote-062", "quote-063"],
  ];
  for (const missing of missingSets) {
    const gone = new Set(missing);
    assert.equal(gone.has("quote-004"), false);
    const live = spaceQuotesByAuthor(OPEN_DAILY_QUOTES.filter((quote) => !gone.has(dailyQuoteId(quote))));
    assert.equal(live.length, 108);
    authorGapHolds(live);
    const liveIds = live.map((quote) => dailyQuoteId(quote));
    const shown = live[shownIndex(liveIds, pin, "2026-10-26")];
    assert.equal(shown.author, "В. С. Найпол");
    assert.equal(live.some((quote) => dailyQuoteId(quote) === "quote-004"), true);
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
