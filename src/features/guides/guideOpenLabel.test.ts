import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../../scripts/sql-guard.mjs";
import { guideOpenLine, guideReadDecision, personName, shouldRecordGuideOpen } from "./guideOpenLabel";
import { guideReadLetter, mentorGuideReadUrl } from "@/lib/guideReadMail";

test("SQL только добавляет таблицу открытий", () => {
  const sql = fs.readFileSync(path.join(import.meta.dirname, "../../../docs/sql/2026-11-01-guide-open.sql"), "utf8");
  assert.deepEqual(findDestructive(sql), []);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "GuideOpen"/);
  assert.doesNotMatch(sql, /DROP TABLE|DELETE FROM|TRUNCATE/i);
});

test("строка открытия: имя и дата, логин не подставляется", () => {
  const at = new Date("2026-11-01T10:00:00Z");
  assert.equal(guideOpenLine("Виктория", at), "Открыли: Виктория — 1 ноября 2026 г.");
  assert.equal(guideOpenLine("Yannie_E", at), null);
  assert.equal(personName("Виктория student@example.com"), "Виктория");
});

test("наставник не считается, первое открытие отдельно от повторного", () => {
  assert.equal(shouldRecordGuideOpen("STUDENT"), true);
  assert.equal(shouldRecordGuideOpen("MENTOR"), false);
  const now = new Date("2026-11-02T08:00:00Z");
  assert.equal(guideReadDecision(null, now).first, true);
  const again = guideReadDecision({ firstOpenedAt: new Date("2026-11-01T10:00:00Z") }, now);
  assert.equal(again.first, false);
  assert.equal(again.firstOpenedAt.toISOString(), "2026-11-01T10:00:00.000Z");
  assert.equal(again.lastOpenedAt.toISOString(), now.toISOString());
});

test("письмо наставнику: имя, название и прямая ссылка", () => {
  const letter = guideReadLetter({
    name: "Виктория",
    title: "Сцена у реки",
    url: mentorGuideReadUrl("student-1", "guide-1"),
  });
  assert.match(letter.subject, /Виктория: открыта методичка/);
  assert.match(letter.text, /Виктория: открыта методичка/);
  assert.match(letter.text, /«Сцена у реки»/);
  assert.match(letter.text, /\/student-view\/student-1\/materials#guide-guide-1/);
  assert.doesNotMatch(letter.text, /Yannie_E/);
  const login = guideReadLetter({ name: "Yannie_E", title: "Сцена", url: "https://studio.example/student-view/s/materials#guide-g" });
  assert.match(login.subject, /^Ученик: открыта методичка/);
});
