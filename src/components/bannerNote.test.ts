import assert from "node:assert/strict";
import test from "node:test";
import { BANNER_NOTE_PREVIEW_CHARS, bannerNoteIsLong } from "./bannerNote";

test("короткое примечание в баннере не сворачивается", () => {
  assert.equal(bannerNoteIsLong(""), false);
  assert.equal(bannerNoteIsLong("   "), false);
  assert.equal(bannerNoteIsLong("Приём рассказов до сорока тысяч знаков."), false);
});

test("примечание длиннее превью сворачивается", () => {
  assert.equal(bannerNoteIsLong("я".repeat(BANNER_NOTE_PREVIEW_CHARS)), false);
  assert.equal(bannerNoteIsLong("я".repeat(BANNER_NOTE_PREVIEW_CHARS + 1)), true);
});

test("примечание выше трёх строк сворачивается, даже если знаков мало", () => {
  assert.equal(bannerNoteIsLong("раз\nдва\nтри"), false);
  assert.equal(bannerNoteIsLong("раз\nдва\nтри\nчетыре"), true);
});
