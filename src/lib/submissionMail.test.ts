import assert from "node:assert/strict";
import test from "node:test";
import {
  exerciseFocusIndex,
  mentorSubmissionUrl,
  shouldNotifySubmission,
  submissionLetter,
  submissionStudentName,
} from "./submissionMail";

test("в письме живое имя, логин не попадает", () => {
  assert.equal(submissionStudentName("Надежда"), "Надежда");
  assert.equal(submissionStudentName("Ян Yannie_E"), "Ян");
  assert.equal(submissionStudentName("Yannie_E"), "");
  assert.equal(submissionStudentName("anna@example.com"), "");
});

test("письмо только при новой сдаче самого ученика", () => {
  assert.equal(shouldNotifySubmission("STUDENT", "IN_PROGRESS", "SUBMITTED"), true);
  assert.equal(shouldNotifySubmission("STUDENT", "NEEDS_REVISION", "SUBMITTED"), true);
  assert.equal(shouldNotifySubmission("STUDENT", "SUBMITTED", "SUBMITTED"), false);
  assert.equal(shouldNotifySubmission("STUDENT", "IN_PROGRESS", "ACCEPTED"), false);
  assert.equal(shouldNotifySubmission("MENTOR", "IN_PROGRESS", "SUBMITTED"), false);
});

test("письмо короткое: имя, раздел, название и ссылка наставника", () => {
  const url = mentorSubmissionUrl("student-1", "tasks", "task-1");
  assert.match(url, /\/student-view\/student-1\/tasks\?tab=submitted#task-task-1$/);
  const letter = submissionLetter({
    name: "Надежда Yannie_E",
    section: "Задания",
    title: "Черновик первой главы",
    url,
  });
  assert.equal(letter.subject, "Надежда: сдано на проверку");
  assert.match(letter.text, /Надежда: сдано на проверку/);
  assert.match(letter.text, /Задания/);
  assert.match(letter.text, /Черновик первой главы/);
  assert.match(letter.text, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(letter.text.includes("Yannie_E"), false);
  assert.equal(letter.html.includes("fonts.googleapis"), false);
  assert.equal(letter.html.includes("Onest"), false);
  assert.equal(letter.html.includes("List-Unsubscribe"), false);
  assert.match(letter.html, /display:none[^>]*>Надежда: сдано на проверку\./);
  assert.match(letter.html, /Открыть/);
  assert.equal(exerciseFocusIndex("circle"), 2);
  assert.equal(exerciseFocusIndex("нет"), 0);
  assert.match(mentorSubmissionUrl("s", "circle", "card-1"), /focus=circle#exercise-card-1$/);
});
