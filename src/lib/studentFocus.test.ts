import assert from "node:assert/strict";
import test from "node:test";
import {
  currentWorkLabel,
  nearestDeadlineViews,
  nearestPaymentViews,
  type FocusSource,
} from "./studentFocus";

const now = new Date("2026-10-19T12:00:00Z");

function source(partial: Partial<FocusSource> = {}): FocusSource {
  return { tasks: [], chapters: [], stories: [], books: [], ...partial };
}

test("пустая работа — пустая подпись", () => {
  assert.equal(currentWorkLabel(source(), now), null);
});

test("ближайшее задание в процессе важнее главы и рассказа", () => {
  const label = currentWorkLabel(
    source({
      tasks: [
        { title: "Поздняя сцена", deadline: new Date("2026-11-02T12:00:00Z"), order: 1, updatedAt: now },
        { title: "Сцена встречи", deadline: new Date("2026-10-25T09:00:00Z"), order: 0, updatedAt: now },
      ],
      chapters: [{ title: "Север", order: 1, writtenChars: 1000, plannedChars: 4000, bookCreatedAt: now }],
      stories: [{ title: "Река", order: 0, started: true }],
    }),
    now,
  );
  assert.equal(label, "Сцена встречи");
});

test("глава в работе, если задания нет", () => {
  const label = currentWorkLabel(
    source({
      chapters: [
        { title: "", order: 0, writtenChars: 2000, plannedChars: 2000, bookCreatedAt: now },
        { title: "Север", order: 3, writtenChars: 800, plannedChars: 4000, bookCreatedAt: now },
      ],
    }),
    now,
  );
  assert.equal(label, "Глава 4, «Север»");
});

test("рассказ, если нет задания и главы в работе", () => {
  assert.equal(
    currentWorkLabel(source({ stories: [{ title: "Река", order: 0, started: true }] }), now),
    "Рассказ «Река»",
  );
});

test("рукопись, если в книге уже есть текст, а главы ещё не начаты", () => {
  assert.equal(
    currentWorkLabel(
      source({
        books: [{ title: "Сад за северной стеной", createdAt: now, started: true }],
        chapters: [{ title: "", order: 0, writtenChars: 0, plannedChars: 2000, bookCreatedAt: now }],
      }),
      now,
    ),
    "Сад за северной стеной",
  );
});

test("ближайшие дедлайны без прошедших и принятых", () => {
  const views = nearestDeadlineViews(
    [
      { id: "old", studentId: "a", student: "Анна", title: "Старое", deadline: new Date("2026-10-01T09:00:00Z"), status: "IN_PROGRESS" },
      { id: "done", studentId: "a", student: "Анна", title: "Принято", deadline: new Date("2026-10-20T09:00:00Z"), status: "ACCEPTED" },
      { id: "today", studentId: "a", student: "Анна", title: "Правки", deadline: new Date("2026-10-19T09:00:00Z"), status: "NEEDS_REVISION" },
      { id: "blank", studentId: "b", student: "Елена", title: "  ", deadline: new Date("2026-10-21T09:00:00Z"), status: "IN_PROGRESS" },
    ],
    now,
  );
  assert.deepEqual(
    views.map((item) => [item.when, item.title, item.hot]),
    [
      ["сегодня", "Правки", true],
      ["21 окт", "Задание", false],
    ],
  );
  assert.equal(views[0]?.href, "/student-view/a/tasks");
});

test("ближайшие оплаты и пустой список", () => {
  assert.deepEqual(nearestPaymentViews([], now), []);
  const views = nearestPaymentViews(
    [
      { id: "late", name: "Анна", paymentDay: 5, paymentAmount: null },
      { id: "soon", name: "Елена", paymentDay: 20, paymentAmount: 8000 },
    ],
    now,
  );
  assert.deepEqual(
    views.map((item) => [item.student, item.when, item.amount]),
    [
      ["Елена", "завтра", "8\u00a0000 ₽"],
      ["Анна", "5-го", null],
    ],
  );
});
