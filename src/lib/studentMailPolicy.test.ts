import assert from "node:assert/strict";
import test from "node:test";
import { STUDENT_MAIL_ACCOUNT, STUDENT_MAIL_KEPT, STUDENT_MAIL_STOPPED, studentMailStopped } from "./studentMailPolicy";

test("ученику остаются шесть писем, вход и заявка, остальное снято", () => {
  assert.deepEqual(STUDENT_MAIL_KEPT, [
    "daily-quote",
    "weekly-task",
    "task-accepted",
    "new-task",
    "task-revision",
    "mentor-edit",
  ]);
  assert.deepEqual(STUDENT_MAIL_ACCOUNT, ["password", "registration"]);
  assert.deepEqual(STUDENT_MAIL_STOPPED, ["payment", "deadline", "note-reminder", "guide", "approved"]);
  assert.equal(studentMailStopped("payment"), true);
  assert.equal(studentMailStopped("mentor-edit"), false);
  assert.equal(studentMailStopped("student-edit"), false);
});
