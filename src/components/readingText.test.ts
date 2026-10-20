import assert from "node:assert/strict";
import test from "node:test";
import { parseReading } from "./ReadingText";

test("длинный текст: абзацы, заголовок и список", () => {
  const blocks = parseReading("# Город\n\nПочти всегда мокро.\nДеньги порта — марки.\n\n- мосты\n- склады");
  assert.deepEqual(blocks, [
    { kind: "h", level: 3, text: "Город" },
    { kind: "p", lines: ["Почти всегда мокро.", "Деньги порта — марки."] },
    { kind: "ul", items: ["мосты", "склады"] },
  ]);
});

test("нумерованный список и подзаголовок", () => {
  const blocks = parseReading("## Сцены\n\n1. Пристань\n2. Сад");
  assert.equal(blocks[0]?.kind, "h");
  assert.equal(blocks[1]?.kind, "ol");
});
