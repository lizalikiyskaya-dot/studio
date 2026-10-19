import assert from "node:assert/strict";
import test from "node:test";
import { planUnification, stableId, type UnifyPlanChapter } from "./unifyPlan";

const empty = {
  description: "",
  summary: "",
  dramaticArgument: "",
  note: "",
  images: "",
  actId: null,
  actBreakAfter: false,
};

function chapter(partial: Partial<UnifyPlanChapter> & Pick<UnifyPlanChapter, "id" | "order">): UnifyPlanChapter {
  return { title: "", ...empty, ...partial };
}

test("название плана остаётся, текст трекера попадает в описание один раз", () => {
  const once = planUnification(
    "book",
    [chapter({ id: "p1", order: 0, title: "Глава плана", summary: "Суть", dramaticArgument: "Ядро" })],
    [{ id: "a1", chapters: [{ id: "c1", title: "Из акта", description: "Сцена" }] }],
  );
  assert.equal(once.writes.length, 1);
  assert.equal(once.writes[0].title, "Глава плана");
  assert.match(once.writes[0].description, /Суть/);
  assert.match(once.writes[0].description, /Ядро\nЯдро/);
  assert.match(once.writes[0].description, /Сцена/);
  assert.equal(once.writes[0].actId, "a1");
  assert.deepEqual(once.blockMoves, [{ actChapterId: "c1", planChapterId: "p1" }]);
  assert.equal(once.creates.length, 0);
  assert.equal(once.acts.length, 0);

  const again = planUnification(
    "book",
    [chapter({
      id: "p1",
      order: 0,
      title: once.writes[0].title,
      description: once.writes[0].description,
      summary: "Суть",
      dramaticArgument: "Ядро",
      actId: "a1",
    })],
    [{ id: "a1", chapters: [{ id: "c1", title: "Из акта", description: "Сцена" }] }],
  );
  assert.equal(again.writes.length, 0);
});

test("пустое название берётся из главы акта, лишняя глава акта становится общей", () => {
  const result = planUnification(
    "book",
    [chapter({ id: "p1", order: 0, summary: "Первая строка сути" })],
    [{
      id: "a1",
      chapters: [
        { id: "c1", title: "Из акта", description: "" },
        { id: "c2", title: "Лишняя", description: "Описание лишней" },
      ],
    }],
  );
  assert.equal(result.writes[0].title, "Из акта");
  assert.equal(result.creates.length, 1);
  assert.equal(result.creates[0].title, "Лишняя");
  assert.equal(result.creates[0].actId, "a1");
  assert.equal(result.creates[0].id, stableId("pch_", "c2"));
  assert.equal(result.creates[0].order, 1);
});

test("без актов главы делятся по границе, лишние при актах попадают в «Ещё»", () => {
  const split = planUnification(
    "book",
    [
      chapter({ id: "p1", order: 0, actBreakAfter: true, title: "Первая" }),
      chapter({ id: "p2", order: 1, title: "Вторая" }),
    ],
    [],
  );
  assert.deepEqual(
    split.acts.map((act) => act.title),
    ["Акт 1", "Акт 2"],
  );
  assert.equal(split.writes.find((row) => row.id === "p1")?.actId, stableId("act_", "book:0"));
  assert.equal(split.writes.find((row) => row.id === "p2")?.actId, stableId("act_", "book:1"));

  const loose = planUnification(
    "book",
    [
      chapter({ id: "p1", order: 0, title: "В акте", actId: "a1" }),
      chapter({ id: "p2", order: 1, title: "Без акта" }),
    ],
    [{ id: "a1", chapters: [{ id: "c1", title: "Одна", description: "" }] }],
  );
  assert.equal(loose.acts.length, 1);
  assert.equal(loose.acts[0].title, "Ещё");
  assert.equal(loose.acts[0].order, 1);
  assert.equal(loose.writes.find((row) => row.id === "p2")?.actId, stableId("act_", "book:extra"));
  assert.equal(loose.writes.find((row) => row.id === "p1"), undefined);
});
