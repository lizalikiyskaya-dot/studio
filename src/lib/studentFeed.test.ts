import assert from "node:assert/strict";
import test from "node:test";
import { buildStudentFeed, filterStudentFeed } from "./studentFeed";

const now = new Date("2026-11-02T12:00:00Z");

test("колокольчик ученика: статусы, заметка, правка и просмотренное", () => {
  const items = buildStudentFeed({
    now,
    tasks: [
      { id: "a", title: "Черновик", status: "ACCEPTED", createdAt: new Date("2026-10-01T00:00:00Z"), updatedAt: new Date("2026-11-01T10:00:00Z") },
      { id: "b", title: "Сцена", status: "NEEDS_REVISION", createdAt: new Date("2026-10-01T00:00:00Z"), updatedAt: new Date("2026-11-02T09:00:00Z") },
      { id: "c", title: "Новое", status: "IN_PROGRESS", createdAt: new Date("2026-11-02T08:00:00Z"), updatedAt: new Date("2026-11-02T08:00:00Z") },
      { id: "old", title: "Старое", status: "IN_PROGRESS", createdAt: new Date("2026-08-01T00:00:00Z"), updatedAt: new Date("2026-08-01T00:00:00Z") },
    ],
    notes: [
      {
        id: "n",
        text: "Посмотри финал",
        anchorLabel: "Глава 3",
        anchorUrl: "/dashboard/plan#chapter-3",
        createdAt: new Date("2026-11-02T07:00:00Z"),
        updatedAt: new Date("2026-11-02T07:00:00Z"),
        resolved: false,
        authorRole: "MENTOR",
      },
    ],
    edits: [
      { section: "setting", at: new Date("2026-11-02T06:00:00Z"), byRole: "MENTOR" },
      { section: "tasks", at: new Date("2026-11-02T06:00:00Z"), byRole: "MENTOR" },
    ],
    seen: [{ kind: "task-accepted", sourceId: "a", seenAt: new Date("2026-11-01T11:00:00Z") }],
  });
  assert.deepEqual(items.map((item) => item.kind), ["task-revision", "task-new", "note", "edit", "task-accepted"]);
  assert.equal(items.find((item) => item.kind === "task-accepted")?.seen, true);
  assert.equal(items.find((item) => item.kind === "note")?.href, "/dashboard/plan#chapter-3");
  assert.equal(items.find((item) => item.kind === "edit")?.detail, "Сеттинг");
  assert.equal(filterStudentFeed(items, "tasks").every((item) => item.needsAction), true);
  assert.equal(filterStudentFeed(items, "edits").some((item) => item.kind === "task-new"), false);
});
