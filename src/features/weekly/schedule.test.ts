import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { findDestructive } from "../../../scripts/sql-guard.mjs";
import { formatWeeklyDate, moscowToday, pickWeekly, weekPhase } from "./schedule";

const tasks = [
  { id: "week-2026-10-24", publishedOn: "2026-10-24" },
  { id: "week-2026-10-31", publishedOn: "2026-10-31" },
  { id: "week-2026-12-26", publishedOn: "2026-12-26" },
];

test("московская дата не уезжает на сутки из-за UTC", () => {
  assert.equal(moscowToday(new Date("2026-10-19T20:30:00Z")), "2026-10-19");
  assert.equal(moscowToday(new Date("2026-10-19T21:30:00Z")), "2026-10-20");
});

test("до первой субботы сдавать нечего, видна ближайшая", () => {
  const picked = pickWeekly(tasks, "2026-10-19");
  assert.equal(picked.current, null);
  assert.equal(picked.upcoming?.id, "week-2026-10-24");
});

test("в день публикации и до следующей субботы открыто одно задание", () => {
  assert.equal(pickWeekly(tasks, "2026-10-24").current?.id, "week-2026-10-24");
  assert.equal(pickWeekly(tasks, "2026-10-30").current?.id, "week-2026-10-24");
  assert.equal(pickWeekly(tasks, "2026-10-31").current?.id, "week-2026-10-31");
  assert.equal(pickWeekly(tasks, "2027-01-15").current?.id, "week-2026-12-26");
  assert.equal(pickWeekly(tasks, "2027-01-15").upcoming, null);
});

test("фаза недели", () => {
  const current = "week-2026-10-31";
  assert.equal(weekPhase(tasks[1], "2026-11-02", current), "current");
  assert.equal(weekPhase(tasks[0], "2026-11-02", current), "past");
  assert.equal(weekPhase(tasks[2], "2026-11-02", current), "upcoming");
});

test("дата задания по-русски", () => {
  assert.match(formatWeeklyDate("2026-10-24"), /^24 октября 2026/);
});

test("сид заданий недели добавляет десять текстов и не стирает данные", () => {
  const sql = fs.readFileSync(path.join(process.cwd(), "docs/sql/2026-10-19-weekly-tasks.sql"), "utf8");
  assert.equal(findDestructive(sql).length, 0);
  for (const id of [
    "week-2026-10-24",
    "week-2026-10-31",
    "week-2026-11-07",
    "week-2026-11-14",
    "week-2026-11-21",
    "week-2026-11-28",
    "week-2026-12-05",
    "week-2026-12-12",
    "week-2026-12-19",
    "week-2026-12-26",
  ]) {
    assert.equal(sql.includes(id), true);
  }
  assert.equal(sql.includes("Комната после новости"), true);
  assert.equal(sql.includes("Итог года в одной сцене"), true);
  assert.equal(sql.includes("ON CONFLICT (\"id\") DO NOTHING"), true);
});
