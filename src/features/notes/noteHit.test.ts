import assert from "node:assert/strict";
import test from "node:test";
import { idAtBoxes, idAtOffset } from "./noteHit";

test("клик по жёлтому прямоугольнику находит заметку", () => {
  const hits = [
    { id: "long", boxes: [{ left: 0, top: 0, right: 80, bottom: 20 }] },
    { id: "short", boxes: [{ left: 10, top: 0, right: 30, bottom: 20 }] },
  ];
  assert.equal(idAtBoxes(hits, 15, 10), "short");
  assert.equal(idAtBoxes(hits, 50, 10), "long");
  assert.equal(idAtBoxes(hits, 200, 10), "");
});

test("край подсветки тоже считается попаданием", () => {
  const hits = [{ id: "edge", boxes: [{ left: 40, top: 40, right: 60, bottom: 58 }] }];
  assert.equal(idAtBoxes(hits, 39, 41), "edge");
  assert.equal(idAtBoxes(hits, 36, 41), "");
});

test("смещение внутри цитаты и на стыке соседних", () => {
  const spans = [
    { id: "a", start: 0, end: 5 },
    { id: "b", start: 5, end: 9 },
  ];
  assert.equal(idAtOffset(spans, 0), "a");
  assert.equal(idAtOffset(spans, 4), "a");
  assert.equal(idAtOffset(spans, 5), "b");
  assert.equal(idAtOffset(spans, 9), "b");
  assert.equal(idAtOffset(spans, 10), "");
});

test("в пересечении смещение достаётся более короткой цитате", () => {
  const spans = [
    { id: "long", start: 0, end: 20 },
    { id: "short", start: 4, end: 8 },
  ];
  assert.equal(idAtOffset(spans, 5), "short");
  assert.equal(idAtOffset(spans, 2), "long");
});
