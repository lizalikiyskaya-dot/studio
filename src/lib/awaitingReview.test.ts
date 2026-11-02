import assert from "node:assert/strict";
import test from "node:test";
import { sortAwaiting, waitingLabel, type AwaitingItem } from "./awaitingReview";

const now = new Date("2026-11-02T12:00:00Z");

function item(partial: Partial<AwaitingItem> & Pick<AwaitingItem, "id" | "at">): AwaitingItem {
  return {
    kind: "task",
    student: "Анна",
    title: partial.id,
    href: "/student-view/a/tasks",
    ...partial,
  };
}

test("ждут разбора: раньше сданное выше, без даты в конце", () => {
  const rows = sortAwaiting([
    item({ id: "new", at: "2026-11-02T11:00:00Z" }),
    item({ id: "none", at: null, kind: "chapter" }),
    item({ id: "old", at: "2026-10-20T11:00:00Z", kind: "weekly" }),
  ]);
  assert.deepEqual(rows.map((row) => row.id), ["old", "new", "none"]);
  assert.equal(waitingLabel("2026-11-02T11:00:00Z", now), "1 ч");
  assert.equal(waitingLabel("2026-11-01T12:00:00Z", now), "1 день");
  assert.equal(waitingLabel("2026-10-31T12:00:00Z", now), "2 дня");
  assert.equal(waitingLabel("2026-10-28T12:00:00Z", now), "5 дней");
  assert.equal(waitingLabel(null, now), "на проверке");
});
