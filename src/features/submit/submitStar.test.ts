import assert from "node:assert/strict";
import test from "node:test";
import { flightDestination, submitReviewControl } from "./submitStar";

test("звёздочка летит к счётчику звёзд, потом к серии, иначе вверх", () => {
  const from = { x: 40, y: 400 };
  assert.deepEqual(flightDestination(from, { x: 80, y: 24 }, { x: 90, y: 70 }), { x: 80, y: 24 });
  assert.deepEqual(flightDestination(from, null, { x: 90, y: 70 }), { x: 90, y: 70 });
  assert.deepEqual(flightDestination(from, null, null), { x: 40, y: 332 });
});

test("кнопка сдачи гаснет только после «принято»", () => {
  assert.equal(submitReviewControl("IN_PROGRESS"), "submit");
  assert.equal(submitReviewControl("PLANNED"), "submit");
  assert.equal(submitReviewControl("NEEDS_REVISION"), "submit");
  assert.equal(submitReviewControl("SUBMITTED"), "submitted");
  assert.equal(submitReviewControl("ACCEPTED"), "hidden");
});
