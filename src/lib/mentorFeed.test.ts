import assert from "node:assert/strict";
import test from "node:test";
import { buildFeed, feedCounts, filterFeed, isUnseen, type FeedDraft } from "./mentorFeed";

function draft(partial: Partial<FeedDraft> & Pick<FeedDraft, "kind" | "sourceId" | "at">): FeedDraft {
  return {
    studentId: "s",
    student: "Анна",
    needsAction: false,
    label: "Правка",
    detail: "",
    href: "/student-view/s/tasks",
    ...partial,
  };
}

test("без отметки событие не прочитано, более новая правка снова открывает его", () => {
  assert.equal(isUnseen("2026-11-02T10:00:00.000Z", undefined), true);
  assert.equal(isUnseen("2026-11-02T10:00:00.000Z", "2026-11-02T11:00:00.000Z"), false);
  assert.equal(isUnseen("2026-11-02T12:00:00.000Z", "2026-11-02T11:00:00.000Z"), true);
});

test("лента ставит непрочитанный разбор выше правки и просмотренного", () => {
  const items = buildFeed(
    [
      draft({ kind: "section", sourceId: "seen", at: "2026-11-02T12:00:00.000Z", label: "старое" }),
      draft({ kind: "exercises", sourceId: "ex", at: "2026-11-02T09:00:00.000Z", label: "упражнения" }),
      draft({
        kind: "task",
        sourceId: "t",
        at: "2026-11-02T08:00:00.000Z",
        needsAction: true,
        label: "Сдано основное задание",
      }),
    ],
    [{ kind: "section", sourceId: "seen", seenAt: "2026-11-02T13:00:00.000Z" }],
  );
  assert.deepEqual(
    items.map((item) => [item.kind, item.seen]),
    [
      ["task", false],
      ["exercises", false],
      ["section", true],
    ],
  );
  assert.deepEqual(feedCounts(items), { action: 1, edits: 1, all: 2 });
});

test("фильтр оставляет разбор одного ученика", () => {
  const items = buildFeed(
    [
      draft({ kind: "task", sourceId: "a", studentId: "v", student: "Виктория", needsAction: true, at: "2026-11-02T08:00:00.000Z" }),
      draft({ kind: "exercises", sourceId: "b", studentId: "v", student: "Виктория", at: "2026-11-02T07:00:00.000Z" }),
      draft({ kind: "weekly", sourceId: "c", studentId: "y", student: "Ян", needsAction: true, at: "2026-11-02T06:00:00.000Z" }),
    ],
    [],
  );
  assert.deepEqual(
    filterFeed(items, "action", "v").map((item) => item.kind),
    ["task"],
  );
});
