import assert from "node:assert/strict";
import test from "node:test";
import { DEADLINE_BANNER_LIMIT, deadlineMoreLabel } from "./deadlineBanner";

test("хвост дедлайнов склоняется", () => {
  assert.equal(DEADLINE_BANNER_LIMIT, 5);
  assert.equal(deadlineMoreLabel(1), "ещё 1 задание");
  assert.equal(deadlineMoreLabel(2), "ещё 2 задания");
  assert.equal(deadlineMoreLabel(5), "ещё 5 заданий");
  assert.equal(deadlineMoreLabel(11), "ещё 11 заданий");
  assert.equal(deadlineMoreLabel(21), "ещё 21 задание");
});
