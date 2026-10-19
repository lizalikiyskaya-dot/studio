import assert from "node:assert/strict";
import test from "node:test";
import { notifyStudentOfMentorEdit } from "./notify";

test("письмо ученику о правках наставника молчит, пока флаг не on", { timeout: 3000 }, async () => {
  const previous = process.env.STUDENT_EDIT_EMAILS;
  try {
    for (const value of [undefined, "", "off", "ON", "1"]) {
      if (value === undefined) delete process.env.STUDENT_EDIT_EMAILS;
      else process.env.STUDENT_EDIT_EMAILS = value;
      const result = await notifyStudentOfMentorEdit("student-does-not-exist", "tasks");
      assert.equal(result, undefined);
    }
  } finally {
    if (previous === undefined) delete process.env.STUDENT_EDIT_EMAILS;
    else process.env.STUDENT_EDIT_EMAILS = previous;
  }
});
