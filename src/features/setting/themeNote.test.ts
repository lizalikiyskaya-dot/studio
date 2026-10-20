import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../../scripts/sql-guard.mjs";
import { themeNoteKey } from "./worldBible";

const sqlPath = path.join(path.resolve(import.meta.dirname, "../../.."), "docs/sql/2026-10-20-theme-note.sql");

test("заметка темы — новая таблица, без правок старых", () => {
  const sql = fs.readFileSync(sqlPath, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "ThemeNote"/);
  assert.match(sql, /"scope" TEXT NOT NULL/);
  assert.match(sql, /"ownerId" TEXT NOT NULL/);
  assert.match(sql, /"settingKey" TEXT NOT NULL DEFAULT ''/);
  assert.match(sql, /"theme" TEXT NOT NULL/);
  assert.match(sql, /"body" TEXT NOT NULL DEFAULT ''/);
  assert.match(sql, /"updatedAt" TIMESTAMP\(3\)/);
  assert.match(sql, /"ThemeNote_scope_ownerId_settingKey_theme_key"/);
  assert.equal(findDestructive(sql).length, 0);
  assert.doesNotMatch(sql, /ALTER TABLE (?!"ThemeNote")/);
  assert.equal(themeNoteKey("primary", "grapesGeography"), "primary\u0000grapesGeography");
  assert.equal(themeNoteKey("", "LOCATIONS"), "\u0000LOCATIONS");
});
