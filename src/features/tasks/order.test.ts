import assert from "node:assert/strict";
import test from "node:test";
import { moveBy, moveWithin, taskRowNumber } from "./order";

const tasks = [
  { id: "a", title: "Правки" },
  { id: "x", title: "Логлайн" },
  { id: "b", title: "Сцена" },
];

test("номера строк идут за новым порядком", () => {
  assert.equal(taskRowNumber(0), "1");
  assert.equal(taskRowNumber(1), "2");
  assert.equal(taskRowNumber(9), "10");
  const next = moveWithin(tasks, ["a", "x", "b"], "b", "a");
  assert.deepEqual(
    next.map((task, index) => `${taskRowNumber(index)} ${task.title}`),
    ["1 Сцена", "2 Правки", "3 Логлайн"],
  );
});

test("стрелки двигают только видимые строки и не трогают скрытую", () => {
  const up = moveBy(tasks, ["a", "b"], "b", -1);
  assert.deepEqual(up.map((task) => task.id), ["b", "x", "a"]);
  assert.deepEqual(moveBy(tasks, ["a", "b"], "a", -1).map((task) => task.id), ["a", "x", "b"]);
  assert.deepEqual(moveBy(up, ["b", "a"], "a", 1).map((task) => task.id), ["b", "x", "a"]);
});

test("перетаскивание внутри вкладки меняет порядок этих строк", () => {
  const next = moveWithin(tasks, ["a", "b"], "a", "b");
  assert.deepEqual(next.map((task) => task.id), ["b", "x", "a"]);
});
