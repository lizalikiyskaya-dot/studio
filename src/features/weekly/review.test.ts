import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pendingWeeklyReviews } from "./review";

test("непросмотренные сдачи недели новее последнего визита", () => {
  const rows = [
    { id: "old", updatedAt: "2026-11-01T10:00:00.000Z" },
    { id: "new", updatedAt: "2026-11-02T10:00:00.000Z" },
  ];
  assert.deepEqual(pendingWeeklyReviews(rows, null).map((row) => row.id), ["old", "new"]);
  assert.deepEqual(pendingWeeklyReviews(rows, "2026-11-01T12:00:00.000Z").map((row) => row.id), ["new"]);
  assert.deepEqual(pendingWeeklyReviews(rows, "2026-11-02T10:00:00.000Z"), []);
});

test("первая сдача недели пишет то же письмо, что и задание", () => {
  const root = path.resolve(import.meta.dirname, "../..");
  const action = fs.readFileSync(path.join(root, "features/weekly/actions.ts"), "utf8");
  assert.match(action, /if \(!existing\)/);
  assert.match(action, /notifyMentorOfSubmission/);
  assert.match(action, /section: "Задание недели"/);
  assert.match(action, /mentorSubmissionUrl\(studentId, "weekly"/);
  assert.doesNotMatch(action, /mailGate\("weekly-task"\)/);
});
