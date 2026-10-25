import assert from "node:assert/strict";
import test from "node:test";
import { chapterReviewLabel, chapterTone } from "./chapterReview";

test("chapter tone follows the mentor status, then how much is written", () => {
  assert.equal(chapterTone("IN_PROGRESS", 0, 10000), "progress");
  assert.equal(chapterTone("IN_PROGRESS", 4000, 10000), "progress");
  assert.equal(chapterTone("IN_PROGRESS", 8000, 10000), "almost");
  assert.equal(chapterTone("IN_PROGRESS", 10000, 10000), "almost");
  assert.equal(chapterTone("SUBMITTED", 1000, 10000), "review");
  assert.equal(chapterTone("IN_REVIEW", 1000, 10000), "review");
  assert.equal(chapterTone("NEEDS_REVISION", 9000, 10000), "revision");
  assert.equal(chapterTone("ACCEPTED", 1000, 10000), "accepted");
});

test("chapter status labels stay in Russian", () => {
  assert.equal(chapterReviewLabel("IN_PROGRESS"), "в процессе");
  assert.equal(chapterReviewLabel("SUBMITTED"), "сдана");
  assert.equal(chapterReviewLabel("IN_REVIEW"), "на проверке");
  assert.equal(chapterReviewLabel("NEEDS_REVISION"), "на доработке");
  assert.equal(chapterReviewLabel("ACCEPTED"), "принята");
});
