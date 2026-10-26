import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findDestructive, sortSqlNames } from "../../../../scripts/sql-guard.mjs";
import { loadBlocks, markdownToBlocks, plainToBlocks, saveBlocks } from "./richText";

const sql = fs.readFileSync("docs/sql/2026-10-27-free-section-format.sql", "utf8");

test("обычный текст возвращается как был, даже со звёздочками и решётками", () => {
  const source = "5 * 3 = 15\n# не заголовок\n- и не список\n\nвторая строка";
  const saved = saveBlocks(plainToBlocks(source));
  assert.equal(saved.format, "plain");
  assert.equal(saved.content, source);
  assert.deepEqual(loadBlocks(saved.content, saved.format), plainToBlocks(source));
});

test("оформление хранится markdown и собирается обратно", () => {
  const source = [
    "## Утро",
    "Герой **вышел** на *крыльцо*.",
    "- чай",
    "- письмо",
    "1. первый шаг",
    "2. второй шаг",
    "> тихий дом",
    "5 \\* 3 остаётся знаком",
  ].join("\n");
  const blocks = markdownToBlocks(source);
  const saved = saveBlocks(blocks);
  assert.equal(saved.format, "markdown");
  assert.deepEqual(markdownToBlocks(saved.content), blocks);
  assert.equal(saved.content.includes("<script"), false);
});

test("пустая карточка остаётся пустой строкой", () => {
  assert.deepEqual(saveBlocks([]), { content: "", format: "plain" });
  assert.deepEqual(saveBlocks(loadBlocks("", "plain")), { content: "", format: "plain" });
});

test("формат текста добавляется столбцом и ничего не удаляет", () => {
  assert.equal(findDestructive(sql).length, 0);
  assert.equal(sql.includes("DELETE"), false);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "contentFormat"/);
  assert.match(sql, /DEFAULT 'plain'/);
  const names = sortSqlNames([
    "2026-10-27-free-section-format.sql",
    "2026-10-26-9-daily-quote-order.sql",
    "2026-10-26-5-badges.sql",
  ]);
  assert.deepEqual(names.at(-1), "2026-10-27-free-section-format.sql");
});
