import assert from "node:assert/strict";
import test from "node:test";
import {
  SUBMISSION_STATUS_LABEL,
  SUBMISSION_STATUSES,
  openCallSentForStatus,
  planOpenCallAdd,
  statusWhenOpenCallSentChanges,
} from "./status";

test("в списке есть не отправлено, отправлено и прежние статусы", () => {
  assert.deepEqual(SUBMISSION_STATUSES, ["NOT_SENT", "SENT", "WAITING", "ACCEPTED", "REJECTED"]);
  assert.equal(SUBMISSION_STATUS_LABEL.NOT_SENT, "не отправлено");
  assert.equal(SUBMISSION_STATUS_LABEL.SENT, "отправлено");
  assert.equal(SUBMISSION_STATUS_LABEL.WAITING, "ждём ответа");
  assert.equal(SUBMISSION_STATUS_LABEL.ACCEPTED, "принято");
  assert.equal(SUBMISSION_STATUS_LABEL.REJECTED, "отклонено");
});

test("опен-колл считается отправленным на любом статусе, кроме «не отправлено»", () => {
  assert.equal(openCallSentForStatus("NOT_SENT"), false);
  assert.equal(openCallSentForStatus("SENT"), true);
  assert.equal(openCallSentForStatus("WAITING"), true);
  assert.equal(openCallSentForStatus("ACCEPTED"), true);
  assert.equal(openCallSentForStatus("REJECTED"), true);
});

test("смена «отправлено» у опен-колла не затирает ответ, принятие и отказ", () => {
  assert.equal(statusWhenOpenCallSentChanges("NOT_SENT", true), "SENT");
  assert.equal(statusWhenOpenCallSentChanges("SENT", true), "SENT");
  assert.equal(statusWhenOpenCallSentChanges("WAITING", true), "WAITING");
  assert.equal(statusWhenOpenCallSentChanges("ACCEPTED", true), "ACCEPTED");
  assert.equal(statusWhenOpenCallSentChanges("REJECTED", false), "NOT_SENT");
  assert.equal(statusWhenOpenCallSentChanges("SENT", false), "NOT_SENT");
});

test("один опен-колл не создаёт вторую заявку", () => {
  assert.deepEqual(
    planOpenCallAdd({ alreadyLinked: true, target: "Литературная", sent: false, sameTarget: null }),
    { kind: "exists" },
  );
  assert.deepEqual(
    planOpenCallAdd({
      alreadyLinked: false,
      target: "Литературная",
      sent: true,
      sameTarget: { id: "row-1", openCallId: "other-call" },
    }),
    { kind: "exists" },
  );
  assert.deepEqual(
    planOpenCallAdd({
      alreadyLinked: false,
      target: "Литературная",
      sent: false,
      sameTarget: { id: "row-1", openCallId: null },
    }),
    { kind: "link", submissionId: "row-1" },
  );
});

test("пустой заголовок всё равно добавляется один раз, статус берётся из опен-колла", () => {
  assert.deepEqual(
    planOpenCallAdd({ alreadyLinked: false, target: "   ", sent: false, sameTarget: { id: "blank", openCallId: null } }),
    { kind: "create", status: "NOT_SENT" },
  );
  assert.deepEqual(
    planOpenCallAdd({ alreadyLinked: false, target: "Новый", sent: true, sameTarget: null }),
    { kind: "create", status: "SENT" },
  );
  assert.deepEqual(
    planOpenCallAdd({ alreadyLinked: false, target: "Новый", sent: false, sameTarget: null }),
    { kind: "create", status: "NOT_SENT" },
  );
});
