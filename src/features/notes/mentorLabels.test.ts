import assert from "node:assert/strict";
import test from "node:test";
import { mentorLabelsFromEnv, mentorNoteLabel } from "./mentorLabels";

test("выключатель по умолчанию выключен и ученику не включается", () => {
  assert.equal(mentorLabelsFromEnv("MENTOR", undefined), false);
  assert.equal(mentorLabelsFromEnv("MENTOR", ""), false);
  assert.equal(mentorLabelsFromEnv("MENTOR", "ON"), false);
  assert.equal(mentorLabelsFromEnv("STUDENT", "on"), false);
  assert.equal(mentorLabelsFromEnv("MENTOR", "on"), true);
});

test("подписи не называют напоминание и не говорят «Сделано»", () => {
  assert.equal(mentorNoteLabel(""), "Общий стикер");
  assert.equal(mentorNoteLabel("   "), "Общий стикер");
  assert.equal(mentorNoteLabel("река у дома"), "Комментарий к фразе");
  const labels = [mentorNoteLabel(""), mentorNoteLabel("фраза")].join(" ");
  assert.equal(labels.includes("напоминание"), false);
  assert.equal(labels.includes("Сделано"), false);
});
