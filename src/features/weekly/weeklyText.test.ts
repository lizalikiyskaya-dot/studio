import assert from "node:assert/strict";
import test from "node:test";
import { weeklyExcerpt, weeklyFormat, weeklyPlain } from "./weeklyText";

test("обычная сдача остаётся простым текстом", () => {
  const text = "Северная река молчит у дома.";
  assert.equal(weeklyFormat(text), "plain");
  assert.equal(weeklyPlain(text), text);
  assert.equal(weeklyExcerpt(text), text);
});

test("жирный и список читаются как разметка редактора", () => {
  const text = "**Туман**\n- крыльцо";
  assert.equal(weeklyFormat(text), "markdown");
  assert.equal(weeklyPlain(text), "Туман\nкрыльцо");
});

test("длинный текст в превью обрезается", () => {
  const text = "а".repeat(240);
  const excerpt = weeklyExcerpt(text, 20);
  assert.equal(excerpt.endsWith("…"), true);
  assert.equal(excerpt.length, 21);
});
