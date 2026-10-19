import assert from "node:assert/strict";
import test from "node:test";
import { hunkCount, resolveHunk } from "./suggestionHunks";

const base = "Роман, северная проза. Герои живут у стены.";
const suggested = "Роман о зимнем саде. Герои живут у стены. Свет здесь короткий.";

test("две правки вокруг нетронутого предложения", () => {
  assert.equal(hunkCount(base, suggested), 2);
});

test("принятие первой правки оставляет вторую", () => {
  const next = resolveHunk(base, suggested, 0, "accept");
  assert.equal(next.value, "Роман о зимнем саде. Герои живут у стены.");
  assert.equal(next.suggestion, "Роман о зимнем саде. Герои живут у стены. Свет здесь короткий.");
  assert.equal(hunkCount(next.value, next.suggestion!), 1);
});

test("отклонение второй правки оставляет первую", () => {
  const next = resolveHunk(base, suggested, 1, "reject");
  assert.equal(next.value, base);
  assert.equal(next.suggestion, "Роман о зимнем саде. Герои живут у стены.");
  assert.equal(hunkCount(next.value, next.suggestion!), 1);
});

test("когда правок не осталось, предложение снимается", () => {
  const once = resolveHunk(base, suggested, 0, "accept");
  const twice = resolveHunk(once.value, once.suggestion!, 0, "reject");
  assert.equal(twice.value, "Роман о зимнем саде. Герои живут у стены.");
  assert.equal(twice.suggestion, null);
});
