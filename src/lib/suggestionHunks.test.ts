import assert from "node:assert/strict";
import test from "node:test";
import { hunkCount, markedSuggestion, resolveHunk } from "./suggestionHunks";

function acceptAll(base: string, suggested: string) {
  let value = base;
  let suggestion: string | null = suggested;
  for (let guard = 0; suggestion && guard < 30; guard++) {
    const next = resolveHunk(value, suggestion, 0, "accept");
    value = next.value;
    suggestion = next.suggestion;
  }
  return { value, suggestion };
}

function rejectAll(base: string, suggested: string) {
  let value = base;
  let suggestion: string | null = suggested;
  for (let guard = 0; suggestion && guard < 30; guard++) {
    const next = resolveHunk(value, suggestion, hunkCount(value, suggestion) - 1, "reject");
    value = next.value;
    suggestion = next.suggestion;
  }
  return { value, suggestion };
}

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

test("вставка в середину строки не повторяет старый текст", () => {
  const original = "Ян уверен, что дом у реки держится на его молчании.";
  const edited = "Ян уверен, что дом у реки держится на его упрямом молчании.";
  const tokens = markedSuggestion(original, edited);
  const added = tokens.filter((token) => token.type === "add").map((token) => token.text).join("");
  assert.equal(added, "упрямом ");
  assert.equal(tokens.some((token) => token.type === "add" && token.text.includes("дом у реки")), false);
});

test("принять все правки даёт предложенный текст, отклонить все — исходный", () => {
  const cases = [
    ["Ян молчит.", "Ян долго молчит."],
    ["Ян молчит.", "Но Ян молчит."],
    ["Ян молчит.", "Ян молчит. Сестра ждёт."],
    ["Ян молчит у реки.", "Ян молчит."],
    [
      "Ян уверен, что дом держится на молчании.\nОн прячет письма.",
      "Ян уверен, что дом держится на упрямом молчании.\nОн прячет письма.\nНочью он перечитывает одно.",
    ],
    ["Герой живёт у моря.", "Герой очень тихо живёт у моря."],
  ] as const;
  for (const [original, edited] of cases) {
    const accepted = acceptAll(original, edited);
    assert.equal(accepted.value, edited);
    assert.equal(accepted.suggestion, null);
    const rejected = rejectAll(original, edited);
    assert.equal(rejected.value, original);
    assert.equal(rejected.suggestion, null);
  }
});

test("правка внутри уже предложенной вставки сходится к новому тексту", () => {
  const original = "Герой живёт у моря.";
  const once = "Герой тихо живёт у моря.";
  const twice = "Герой очень тихо живёт у моря.";
  const first = acceptAll(original, once);
  assert.equal(first.value, once);
  const second = acceptAll(once, twice);
  assert.equal(second.value, twice);
  assert.equal(second.suggestion, null);
});

function changed(base: string, suggested: string) {
  return markedSuggestion(base, suggested)
    .filter((token) => token.type !== "same")
    .map((token) => `${token.type}:${token.text}`)
    .join("|");
}

test("замена одного слова в середине не захватывает фразу", () => {
  const base = "Ян уверен, что дом молчит у реки.";
  const suggested = "Ян уверен, что дом говорит у реки.";
  assert.equal(changed(base, suggested), "del:молчит|add:говорит");
  const accepted = resolveHunk(base, suggested, 0, "accept");
  assert.equal(accepted.value, suggested);
  assert.equal(accepted.suggestion, null);
  const rejected = resolveHunk(base, suggested, 0, "reject");
  assert.equal(rejected.value, base);
  assert.equal(rejected.suggestion, null);
});

test("замена фразы помечает только изменённый кусок", () => {
  const base = "Герой ищет дорогу домой и собирает спутников.";
  const suggested = "Герой ищет тихую тропу к морю и собирает спутников.";
  assert.equal(changed(base, suggested), "del:дорогу домой|add:тихую тропу к морю");
  const accepted = resolveHunk(base, suggested, 0, "accept");
  assert.equal(accepted.value, suggested);
  assert.equal(accepted.suggestion, null);
});

test("чистая вставка и чистое удаление не трогают соседей", () => {
  const inserted = markedSuggestion("Ян молчит у реки.", "Ян долго молчит у реки.");
  assert.equal(
    inserted.filter((token) => token.type !== "same").map((token) => token.text).join(""),
    "долго ",
  );
  const removed = markedSuggestion("Ян долго молчит у реки.", "Ян молчит у реки.");
  assert.equal(
    removed.filter((token) => token.type !== "same").map((token) => `${token.type}:${token.text}`).join("|"),
    "del:долго ",
  );
  const accepted = resolveHunk("Ян молчит у реки.", "Ян долго молчит у реки.", 0, "accept");
  assert.equal(accepted.value, "Ян долго молчит у реки.");
  const rejected = resolveHunk("Ян долго молчит у реки.", "Ян молчит у реки.", 0, "reject");
  assert.equal(rejected.value, "Ян долго молчит у реки.");
  assert.equal(rejected.suggestion, null);
});

test("когда правок не осталось, предложение снимается", () => {
  const once = resolveHunk(base, suggested, 0, "accept");
  const twice = resolveHunk(once.value, once.suggestion!, 0, "reject");
  assert.equal(twice.value, "Роман о зимнем саде. Герои живут у стены.");
  assert.equal(twice.suggestion, null);
});
