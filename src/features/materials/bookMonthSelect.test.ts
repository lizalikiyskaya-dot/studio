import assert from "node:assert/strict";
import test from "node:test";
import { bookMonthYears, formatStoredBookMonth, parseStoredBookMonth } from "./bookMonthSelect";

test("обычный месяц и год читаются", () => {
  assert.deepEqual(parseStoredBookMonth("ноябрь 2026"), { month: 11, year: 2026 });
  assert.deepEqual(parseStoredBookMonth("  Январь   2027 "), { month: 1, year: 2027 });
});

test("родительный падеж из старых названий тоже читается", () => {
  assert.deepEqual(parseStoredBookMonth("мая 2026"), { month: 5, year: 2026 });
  assert.deepEqual(parseStoredBookMonth("декабря 2025"), { month: 12, year: 2025 });
});

test("составной или пустой месяц не ломается", () => {
  assert.equal(parseStoredBookMonth(null), null);
  assert.equal(parseStoredBookMonth(""), null);
  assert.equal(parseStoredBookMonth("ноябрь 2026, декабрь 2026"), null);
  assert.equal(parseStoredBookMonth("скоро"), null);
});

test("запись остаётся строкой «месяц год»", () => {
  assert.equal(formatStoredBookMonth(11, 2026), "ноябрь 2026");
  assert.equal(formatStoredBookMonth(5, 2026), "май 2026");
  assert.equal(formatStoredBookMonth(0, 2026), null);
});

test("годы: текущий−5 … текущий+2, плюс уже записанный", () => {
  assert.deepEqual(bookMonthYears(new Date("2026-10-19T00:00:00Z")), [
    2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028,
  ]);
  assert.deepEqual(bookMonthYears(new Date("2026-10-19T00:00:00Z"), 2014), [
    2014, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028,
  ]);
});
