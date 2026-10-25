import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findDestructive, sortSqlNames } from "../../../scripts/sql-guard.mjs";
import { BADGES } from "./catalogue";

const schemaSql = fs.readFileSync("docs/sql/2026-10-26-5-badges.sql", "utf8");
const backfillSql = fs.readFileSync("docs/sql/2026-10-26-6-badge-backfill.sql", "utf8");

test("файлы значков только добавляют и идут после серии", () => {
  assert.equal(findDestructive(schemaSql).length, 0);
  assert.equal(findDestructive(backfillSql).length, 0);
  const names = sortSqlNames([
    "2026-10-26-4-streak-backfill.sql",
    "2026-10-26-6-badge-backfill.sql",
    "2026-10-26-5-badges.sql",
  ]);
  assert.deepEqual(names, [
    "2026-10-26-4-streak-backfill.sql",
    "2026-10-26-5-badges.sql",
    "2026-10-26-6-badge-backfill.sql",
  ]);
});

test("справочник в одном файле, выдача прошлых значков в другом", () => {
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS "Badge"/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS "BadgeAward"/);
  assert.equal(schemaSql.includes('INSERT INTO "BadgeAward"'), false);
  assert.match(backfillSql, /INSERT INTO "BadgeAward"/);
  for (const badge of BADGES) assert.match(schemaSql, new RegExp(badge.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(backfillSql.includes("ten-thousand"), false);
  assert.equal(backfillSql.includes("second-draft"), false);
  for (const id of ["first-chapter", "spark", "candle", "lighthouse", "level-5", "level-150", "book-done"]) {
    assert.match(backfillSql, new RegExp(id));
  }
});
