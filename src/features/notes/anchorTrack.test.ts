import assert from "node:assert/strict";
import test from "node:test";
import { freshSnap, trackSources } from "./anchorTrack";

const note = { id: "n1", anchorQuote: "молчит", anchorOffset: null as number | null };

test("первое появление запоминает смещение и больше его не шлёт", () => {
  const state = freshSnap();
  const first = trackSources(state, [{ key: "field", text: "Ян молчит у реки." }], [note]);
  assert.deepEqual(first.updates, [{ id: "n1", quote: "молчит", offset: 3 }]);
  assert.equal(first.placements[0]?.start, 3);
  const second = trackSources(state, [{ key: "field", text: "Ян молчит у реки." }], [note]);
  assert.deepEqual(second.updates, []);
  assert.equal(second.placements[0]?.start, 3);
});

test("правка поля двигает только заметку этого поля", () => {
  const state = freshSnap();
  const hero = { id: "hero", anchorQuote: "река", anchorOffset: 0 };
  const task = { id: "task", anchorQuote: "река", anchorOffset: 0 };
  trackSources(state, [
    { key: "hero", text: "река течёт" },
    { key: "task", text: "река ждёт" },
  ], [hero, task]);
  const next = trackSources(state, [
    { key: "hero", text: "большая река течёт" },
    { key: "task", text: "река ждёт" },
  ], [hero, task]);
  assert.deepEqual(next.updates, [{ id: "hero", quote: "река", offset: 8 }]);
  assert.equal(next.placements.find((item) => item.id === "task")?.start, 0);
});

test("смещение поля не заменяется индексом другого текста", () => {
  const state = freshSnap();
  const note = { id: "n", anchorQuote: "река", anchorOffset: 0 };
  trackSources(state, [{ key: "field", text: "река течёт" }], [note]);
  const next = trackSources(state, [{ key: "dom", text: "длинный абзац, и только потом река" }], [note]);
  assert.deepEqual(next.updates, []);
  assert.equal(next.placements[0]?.key, "dom");
  assert.ok((next.placements[0]?.start ?? 0) > 0);
});

test("буква внутри цитаты остаётся подсвеченной", () => {
  const state = freshSnap();
  const anchored = { id: "n1", anchorQuote: "молчит", anchorOffset: 3 };
  trackSources(state, [{ key: "field", text: "Ян молчит у реки." }], [anchored]);
  const next = trackSources(state, [{ key: "field", text: "Ян молчал у реки." }], [anchored]);
  assert.deepEqual(next.updates, [{ id: "n1", quote: "молчал", offset: 3 }]);
  assert.equal(next.placements[0]?.end, 3 + "молчал".length);
});
