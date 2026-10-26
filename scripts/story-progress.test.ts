import assert from "node:assert/strict";
import test from "node:test";
import { storyCount, storyPercent, storyStatusLabel } from "../src/features/stories/storyProgress";

test("a missing or zero plan is 0%, never NaN", () => {
  assert.equal(storyPercent(undefined, undefined), 0);
  assert.equal(storyPercent(1200, 0), 0);
  assert.equal(storyPercent(Number.NaN, Number.NaN), 0);
  assert.equal(storyPercent(4200, 12000), 35);
});

test("character sums ignore missing values", () => {
  assert.equal(storyCount(undefined) + storyCount(4200), 4200);
  assert.equal(storyCount(null), 0);
});

test("a missing status still names the chip", () => {
  assert.equal(storyStatusLabel(undefined), "в процессе");
  assert.equal(storyStatusLabel("IN_REVIEW"), "на проверке");
  assert.equal(storyStatusLabel("nope"), "в процессе");
});
