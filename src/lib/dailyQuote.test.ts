import assert from "node:assert/strict";
import test from "node:test";
import { DAILY_QUOTES } from "@/data/dailyQuotes";
import { quoteForDate } from "./dailyQuote";

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

test("в один московский день цитата одна и та же", () => {
  const morning = new Date("2026-10-19T00:30:00+03:00");
  const evening = new Date("2026-10-19T23:30:00+03:00");
  const next = new Date("2026-10-20T00:30:00+03:00");
  assert.equal(quoteForDate(morning).text, quoteForDate(evening).text);
  assert.equal(quoteForDate(morning).author, quoteForDate(evening).author);
  assert.notEqual(quoteForDate(morning).text, quoteForDate(next).text);
});
