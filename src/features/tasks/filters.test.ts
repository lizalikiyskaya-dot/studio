import assert from "node:assert/strict";
import test from "node:test";
import { TASK_FILTERS, TASK_STATUS_LABEL } from "./status";

test("фильтры заданий начинаются с всех, процесса и запланировано", () => {
  assert.deepEqual(
    TASK_FILTERS.slice(0, 3).map((tab) => tab.label),
    ["Все задачи", "В процессе", "Запланировано"],
  );
  assert.equal(TASK_FILTERS[2]?.status, "PLANNED");
  assert.equal(TASK_STATUS_LABEL.PLANNED, "запланировано");
});
