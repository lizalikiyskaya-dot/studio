import assert from "node:assert/strict";
import test from "node:test";
import {
  appendMaterial,
  applyMaterialTitles,
  enqueueById,
  enqueueCreate,
  nextMaterialOrder,
  titleSaveFromField,
} from "./materialRows";

test("новая строка получает max+1, а не количество", () => {
  assert.equal(nextMaterialOrder([]), 0);
  // Одна методичка с order 2: count дал бы 1 и после перезагрузки строка
  // прыгнула бы выше существующей.
  assert.equal(nextMaterialOrder([2]), 3);
  // Дырка 0,2: count равен 2 и совпал бы с уже занятым order.
  assert.equal(nextMaterialOrder([0, 2]), 3);
});

test("два названия сохраняются на свои строки и не трогают файл", () => {
  const rows = [
    { id: "guide-1", title: "Новая методичка", fileName: "one.pdf" },
    { id: "guide-2", title: "Новая методичка", fileName: null as string | null },
  ];
  const first = titleSaveFromField("guide-1", "Первая");
  const second = titleSaveFromField("guide-2", "Вторая");
  assert.ok(first);
  assert.ok(second);
  const saved = applyMaterialTitles(rows, [first, second]);
  assert.deepEqual(
    saved.map((row) => ({ id: row.id, title: row.title, fileName: row.fileName })),
    [
      { id: "guide-1", title: "Первая", fileName: "one.pdf" },
      { id: "guide-2", title: "Вторая", fileName: null },
    ],
  );
  assert.equal(titleSaveFromField(undefined, "Вторая"), null);
});

test("повтор того же id не создаёт вторую строку", () => {
  const created = { id: "guide-1", title: "Новая методичка" };
  const once = appendMaterial([], created);
  const twice = appendMaterial(once, created);
  assert.equal(twice, once);
  const next = appendMaterial(twice, { id: "guide-2", title: "Новая методичка" });
  assert.deepEqual(
    next.map((row) => row.id),
    ["guide-1", "guide-2"],
  );
});

test("медленное сохранение первой строки не забирает название второй", async () => {
  const queues = new Map<string, Promise<void>>();
  const writes: { id: string; title: string }[] = [];
  let releaseFirst: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  enqueueById(queues, "guide-1", async () => {
    await gate;
    writes.push({ id: "guide-1", title: "Первая" });
  });
  enqueueById(queues, "guide-2", async () => {
    writes.push({ id: "guide-2", title: "Вторая" });
  });
  enqueueById(queues, "guide-1", async () => {
    writes.push({ id: "guide-1", title: "Первая, правка" });
  });

  await queues.get("guide-2");
  assert.deepEqual(writes, [{ id: "guide-2", title: "Вторая" }]);

  releaseFirst();
  await queues.get("guide-1");
  assert.deepEqual(writes, [
    { id: "guide-2", title: "Вторая" },
    { id: "guide-1", title: "Первая" },
    { id: "guide-1", title: "Первая, правка" },
  ]);
});

test("вторая методичка создаётся после того, как первая попала в список", async () => {
  let chain = Promise.resolve();
  const ids: string[] = [];
  let releaseFirst: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  chain = enqueueCreate(
    chain,
    async () => {
      await gate;
      return "guide-1";
    },
    (id) => ids.push(id),
  );
  chain = enqueueCreate(
    chain,
    async () => "guide-2",
    (id) => ids.push(id),
  );

  assert.deepEqual(ids, []);
  releaseFirst();
  await chain;
  assert.deepEqual(ids, ["guide-1", "guide-2"]);
});
