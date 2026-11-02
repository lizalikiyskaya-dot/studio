import assert from "node:assert/strict";
import test from "node:test";
import { STUDENT_FEED_POPUP, buildStudentFeed, filterStudentFeed } from "./studentFeed";

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

test("колокольчик показывает восемь свежих, страница хранит всё", () => {
  const tasks = Array.from({ length: 10 }, (_, index) => ({
    id: `t${index}`,
    title: `Задание ${index}`,
    status: "IN_PROGRESS" as const,
    createdAt: new Date(Date.parse("2026-11-02T00:00:00Z") + index * 60000),
    updatedAt: new Date(Date.parse("2026-11-02T00:00:00Z") + index * 60000),
  }));
  const recent = buildStudentFeed({ now, tasks, notes: [], edits: [], seen: [] });
  assert.equal(recent.length, 10);
  assert.equal(STUDENT_FEED_POPUP, 8);
});

test("удалённое скрыто, полная история держит старое задание", () => {
  const shared = {
    now,
    tasks: [
      { id: "old", title: "Старое", status: "ACCEPTED" as const, createdAt: new Date("2026-08-01T00:00:00Z"), updatedAt: new Date("2026-08-02T00:00:00Z") },
      { id: "gone", title: "Скрытое", status: "NEEDS_REVISION" as const, createdAt: new Date("2026-11-01T00:00:00Z"), updatedAt: new Date("2026-11-02T09:00:00Z") },
    ],
    notes: [],
    edits: [],
    seen: [{ kind: "task-revision", sourceId: "gone", seenAt: new Date("2026-11-02T10:00:00Z"), dismissedAt: new Date("2026-11-02T10:00:00Z") }],
  };
  assert.deepEqual(buildStudentFeed(shared).map((item) => item.sourceId), []);
  assert.deepEqual(buildStudentFeed({ ...shared, full: true }).map((item) => item.sourceId), ["old"]);
  const returned = buildStudentFeed({
    ...shared,
    full: true,
    tasks: [{ id: "gone", title: "Скрытое", status: "NEEDS_REVISION", createdAt: new Date("2026-11-01T00:00:00Z"), updatedAt: new Date("2026-11-02T12:00:00Z") }],
  });
  assert.deepEqual(returned.map((item) => item.sourceId), ["gone"]);
});
