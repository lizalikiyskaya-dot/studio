import assert from "node:assert/strict";
import test from "node:test";
import { TASK_FILTERS, TASK_STATUS_LABEL } from "./status";

test("фильтры заданий начинаются с процесса, запланировано и всех", () => {
  assert.deepEqual(
    TASK_FILTERS.slice(0, 3).map((tab) => tab.label),
    ["В процессе", "Запланировано", "Все задачи"],
  );
  assert.equal(TASK_FILTERS[1]?.status, "PLANNED");
  assert.equal(TASK_STATUS_LABEL.PLANNED, "запланировано");
});
