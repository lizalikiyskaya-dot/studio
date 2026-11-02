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

test("ближайшие дедлайны: принятое скрыто, просроченное и все будущие видны", () => {
  const views = nearestDeadlineViews(
    [
      { id: "old", studentId: "a", student: "Анна", title: "Старое", deadline: new Date("2026-10-01T09:00:00Z"), status: "IN_PROGRESS" },
      { id: "done", studentId: "a", student: "Анна", title: "Принято", deadline: new Date("2026-10-20T09:00:00Z"), status: "ACCEPTED" },
      { id: "today", studentId: "a", student: "Анна", title: "Правки", deadline: new Date("2026-10-19T09:00:00Z"), status: "NEEDS_REVISION" },
      { id: "blank", studentId: "b", student: "Елена", title: "  ", deadline: new Date("2026-10-21T09:00:00Z"), status: "IN_PROGRESS" },
      { id: "same-a", studentId: "v", student: "Виктория", title: "Методичка 1", deadline: new Date("2026-11-08T00:00:00Z"), status: "IN_PROGRESS" },
      { id: "same-b", studentId: "v", student: "Виктория", title: "Неделя 2, дополнительное", deadline: new Date("2026-11-08T00:00:00Z"), status: "SUBMITTED" },
      { id: "later", studentId: "y", student: "Yannie_E", title: "Дальше", deadline: new Date("2026-11-22T00:00:00Z"), status: "PLANNED" },
      { id: "fifth", studentId: "y", student: "Yannie_E", title: "Ещё одно", deadline: new Date("2026-11-15T00:00:00Z"), status: "IN_PROGRESS" },
    ],
    now,
  );
  assert.deepEqual(
    views.map((item) => [item.when, item.student, item.title]),
    [
      ["1 окт", "Анна", "Старое"],
      ["сегодня", "Анна", "Правки"],
      ["21 окт", "Елена", "Задание"],
      ["8 нояб", "Виктория", "Методичка 1"],
      ["8 нояб", "Виктория", "Неделя 2, дополнительное"],
      ["15 нояб", "Yannie_E", "Ещё одно"],
      ["22 нояб", "Yannie_E", "Дальше"],
    ],
  );
  assert.equal(views[0]?.hot, true);
  assert.equal(views[1]?.href, "/student-view/a/tasks");
  assert.equal(views.find((item) => item.title === "Принято"), undefined);
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
