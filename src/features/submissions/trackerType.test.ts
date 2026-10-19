import assert from "node:assert/strict";
import test from "node:test";
import { openCallTrackerFields } from "./tracker";

test("заявка из опен-колла берёт выбранный тип и статус отправки", () => {
  assert.deepEqual(openCallTrackerFields(false, "CONTEST"), { type: "CONTEST", status: "NOT_SENT" });
  assert.deepEqual(openCallTrackerFields(true, "PUBLISHER"), { type: "PUBLISHER", status: "SENT" });
  assert.equal(openCallTrackerFields(false, "OTHER" as "CONTEST"), null);
});
