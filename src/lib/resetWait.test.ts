import assert from "node:assert/strict";
import test from "node:test";
import { RESEND_COOLDOWN_MS, cooldownRemainingMs, formatResetWait } from "./resetWait";

test("повторная ссылка ждёт не больше 2 минут", () => {
  const created = new Date("2026-11-02T03:00:00.000Z");
  assert.equal(cooldownRemainingMs(created, created.getTime() + 30_000), RESEND_COOLDOWN_MS - 30_000);
  assert.equal(cooldownRemainingMs(created, created.getTime() + RESEND_COOLDOWN_MS + 1), 0);
});

test("остаток ожидания называется коротко", () => {
  assert.equal(formatResetWait(120_000), "около 2 минут");
  assert.equal(formatResetWait(90_000), "около 2 минут");
  assert.equal(formatResetWait(60_000), "около минуты");
  assert.equal(formatResetWait(20_000), "меньше минуты");
});
