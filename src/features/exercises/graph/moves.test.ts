import assert from "node:assert/strict";
import test from "node:test";
import { arcMoveFilled, arcPositions, circlePositions, hasText } from "./moves";

test("пустая строка не считается заполненным ходом", () => {
  assert.equal(hasText("  "), false);
  assert.equal(hasText("сцена"), true);
  assert.equal(arcMoveFilled({ posFalseBelief: "" }, "posFalseBelief", "posFalseBeliefScene"), false);
  assert.equal(arcMoveFilled({ posFalseBeliefScene: "на балу" }, "posFalseBelief", "posFalseBeliefScene"), true);
});

test("точки арки не слипаются и остаются внутри поля", () => {
  const points = arcPositions(8);
  assert.equal(points.length, 8);
  for (const point of points) {
    assert.ok(point.x >= 8 && point.x <= 92);
    assert.ok(point.y >= 18 && point.y <= 82);
  }
  assert.ok(points[1].y > points[0].y);
  assert.ok(points[7].y < points[4].y);
});

test("у круга восемь точек вокруг центра", () => {
  const points = circlePositions(8);
  assert.equal(points.length, 8);
  assert.ok(Math.abs(points[0].x - 50) < 1);
  assert.ok(points[0].y < 20);
  assert.ok(points[4].y > 80);
});
