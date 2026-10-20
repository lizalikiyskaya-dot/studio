import assert from "node:assert/strict";
import test from "node:test";
import { anchorOnPage, mapSpan, quoteSpan } from "./quoteMatch";

test("цитата ищется на той же странице", () => {
  assert.equal(anchorOnPage("/dashboard/tasks?tab=all", "/dashboard/tasks"), true);
  assert.equal(anchorOnPage("/dashboard/about", "/dashboard/tasks"), false);
  assert.equal(anchorOnPage("", "/dashboard/tasks"), false);
});

test("первое вхождение цитаты", () => {
  assert.deepEqual(quoteSpan("Речные фонари у северной стены", "фонари у северной"), { start: 7, end: 24 });
  assert.equal(quoteSpan("аб", "а"), null);
  assert.equal(quoteSpan("нет такого", "фонари"), null);
});

test("цитата может начинаться в одном узле и кончаться в другом", () => {
  const chunks = [
    { start: 0, end: 7 },
    { start: 7, end: 25 },
  ];
  const mapped = mapSpan(chunks, 4, 12);
  assert.equal(mapped?.startOffset, 4);
  assert.equal(mapped?.endOffset, 5);
  assert.equal(mapped?.startChunk, chunks[0]);
  assert.equal(mapped?.endChunk, chunks[1]);
});
