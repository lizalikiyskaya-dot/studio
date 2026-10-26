import assert from "node:assert/strict";
import test from "node:test";
import {
  anchorOnPage,
  anchorQuote,
  coverSegments,
  locateQuote,
  mapSpan,
  quoteSpan,
  shiftAnchor,
  urlForViewer,
} from "./quoteMatch";

test("цитата ищется на той же странице", () => {
  assert.equal(anchorOnPage("/dashboard/tasks?tab=all", "/dashboard/tasks"), true);
  assert.equal(anchorOnPage("/dashboard/about", "/dashboard/tasks"), false);
  assert.equal(anchorOnPage("", "/dashboard/tasks"), false);
  assert.equal(anchorOnPage("/student-view/abc/exercises", "/dashboard/exercises"), true);
  assert.equal(anchorOnPage("/dashboard/exercises?book=1", "/student-view/abc/exercises"), true);
  assert.equal(anchorOnPage("/student-view/abc/tasks", "/dashboard/exercises"), false);
});

test("первое вхождение цитаты", () => {
  assert.deepEqual(quoteSpan("Речные фонари у северной стены", "фонари у северной"), { start: 7, end: 24 });
  assert.equal(quoteSpan("аб", "а"), null);
  assert.equal(quoteSpan("нет такого", "фонари"), null);
});

test("ученик остаётся в своём кабинете, наставник в просмотре", () => {
  assert.equal(
    urlForViewer("/student-view/abc/exercises?book=1", "/dashboard/exercises"),
    "/dashboard/exercises?book=1",
  );
  assert.equal(
    urlForViewer("/dashboard/tasks", "/student-view/abc/exercises"),
    "/student-view/abc/tasks",
  );
});

test("повтор цитаты держится у своего смещения", () => {
  const text = "река течёт, и снова река";
  assert.equal(locateQuote(text, "река", null)?.start, 0);
  assert.equal(locateQuote(text, "река", 18)?.start, text.lastIndexOf("река"));
});

test("старое многоточие и адрес «ссылка» всё ещё находятся", () => {
  assert.equal(quoteSpan("длинный абзац про дом", "длинный абзац про дом…")?.start, 0);
  assert.equal(quoteSpan("Читать: ссылка в тексте", "Читать: https://example.com/book в тексте")?.start, 0);
});

test("цитата для сохранения не добавляет чужой знак", () => {
  const built = anchorQuote("  река у дома  ", 4);
  assert.equal(built?.quote, "река у дома");
  assert.equal(built?.offset, 6);
  assert.equal(anchorQuote("а", 0), null);
});

test("вставка перед цитатой двигает смещение, правка внутри меняет текст", () => {
  const before = "Ян молчит у реки.";
  const moved = shiftAnchor(before, "очень Ян молчит у реки.", "молчит", 3);
  assert.deepEqual(moved, { quote: "молчит", offset: 9 });
  const edited = shiftAnchor(before, "Ян кричит у реки.", "молчит", 3);
  assert.deepEqual(edited, { quote: "кричит", offset: 3 });
  assert.equal(shiftAnchor(before, "Ян.", "молчит", 3), null);
});

test("соседние подсветки не глотают друг друга, пересечение отдаёт короткой", () => {
  const adjacent = coverSegments([
    { start: 0, end: 4, id: "a", flash: false },
    { start: 4, end: 8, id: "b", flash: true },
  ]);
  assert.deepEqual(adjacent.map((item) => item.id), ["a", "b"]);
  const overlap = coverSegments([
    { start: 0, end: 10, id: "long", flash: false },
    { start: 4, end: 7, id: "short", flash: true },
  ]);
  assert.deepEqual(overlap.map((item) => [item.start, item.id, item.flash]), [
    [0, "long", false],
    [4, "short", true],
    [7, "long", false],
  ]);
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
