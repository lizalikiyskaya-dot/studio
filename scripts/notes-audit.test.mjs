import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(new URL("./notes-audit.sql", import.meta.url), "utf8");

test("команда сверки только читает и закрывает транзакцию откатом", () => {
  assert.match(sql, /BEGIN READ ONLY/);
  assert.match(sql, /ROLLBACK/);
  assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE|CREATE|GRANT|COPY)\b/i);
});

test("в отчёте семь случаев и нет печати текста заметки отдельным столбцом", () => {
  for (const name of ["1 стикер ученика", "2 стикер наставника", "3 цитата похожа", "4 цитата без адреса", "5 закрытый стикер", "6 пустое имя", "7 на стикере уже есть ответ"]) {
    assert.equal(sql.includes(name), true, name);
  }
  assert.equal(sql.includes("SELECT n.text"), false);
  assert.equal(sql.includes("SELECT n.author,"), false);
});
