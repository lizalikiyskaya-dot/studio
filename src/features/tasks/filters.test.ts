import assert from "node:assert/strict";
import test from "node:test";
import { TASK_FILTERS, TASK_STATUS_LABEL } from "./status";

test("фильтры заданий: процесс, запланировано, проверка, доработка, принято, все", () => {
  assert.deepEqual(
    TASK_FILTERS.map((tab) => tab.label),
    ["В процессе", "Запланировано", "Сдано на проверку", "На доработке", "Принято", "Все задачи"],
  );
  assert.equal(TASK_FILTERS[1]?.status, "PLANNED");
  assert.equal(TASK_FILTERS.at(-1)?.status, null);
  assert.equal(TASK_STATUS_LABEL.PLANNED, "запланировано");
});
