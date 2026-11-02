import assert from "node:assert/strict";
import test from "node:test";
import { pickRecentEdits, type RecentEdit } from "./recentEdits";

const row = (studentId: string, section: string, at: string): RecentEdit => ({ studentId, section, at });

test("свежая сдача не теряется за старыми разделами других", () => {
  const events = [
    row("vika", "about", "2026-10-09T10:00:00.000Z"),
    row("vika", "dossier", "2026-09-17T10:00:00.000Z"),
    row("vika", "exercises", "2026-09-10T10:00:00.000Z"),
    row("nadezhda", "about", "2026-10-09T12:00:00.000Z"),
    row("nadezhda", "drafts", "2026-09-06T10:00:00.000Z"),
    row("vanya", "plan", "2026-08-18T10:00:00.000Z"),
    row("yan", "tasks", "2026-11-02T08:00:00.000Z"),
    row("vanya", "tasks", "2026-11-02T09:00:00.000Z"),
  ];
  const picked = pickRecentEdits(events, 6);
  assert.deepEqual(picked.map((item) => `${item.studentId}:${item.section}`), [
    "vanya:tasks",
    "yan:tasks",
    "nadezhda:about",
    "vika:about",
    "vika:dossier",
    "vika:exercises",
  ]);
  assert.equal(picked[0].section, "tasks");
  assert.equal(picked[1].section, "tasks");
});

test("задание недели и сдача новее отметки раздела", () => {
  const picked = pickRecentEdits([
    row("anna", "about", "2026-10-01T10:00:00.000Z"),
    row("anna", "weekly", "2026-11-02T04:20:00.000Z"),
    row("anna", "tasks", "2026-11-02T04:13:00.000Z"),
    row("anna", "cabinet", "2026-11-02T04:15:00.000Z"),
  ]);
  assert.equal(picked[0].section, "weekly");
  assert.equal(picked.some((item) => item.section === "tasks"), true);
  assert.equal(picked.some((item) => item.section === "cabinet"), false);
});
