import assert from "node:assert/strict";
import test from "node:test";
import {
  STREAK_HINT,
  evaluateStreak,
  moscowMonday,
  streakBonus,
  streakMilestones,
  studentManuscriptEditCounts,
  unseenRunWeeks,
  weeksLabel,
} from "./weeks";

const sunday = new Date("2026-10-25T12:00:00.000Z");
const mondayNight = new Date("2026-10-25T22:00:00.000Z");

test("неделя Москвы начинается в понедельник", () => {
  assert.equal(moscowMonday(sunday), "2026-10-19");
  assert.equal(moscowMonday(mondayNight), "2026-10-26");
  assert.equal(moscowMonday(new Date("2026-10-26T00:30:00.000Z")), "2026-10-26");
});

test("пропуск обнуляет серию, текущая пустая неделя её не рвёт", () => {
  const stats = evaluateStreak(["2026-09-21", "2026-09-28", "2026-10-12"], [], sunday);
  assert.equal(stats.current, 1);
  assert.equal(stats.best, 2);
  assert.equal(stats.freshStart, false);
  assert.equal(stats.weeks.at(-1)?.state, "open");
  assert.equal(stats.weeks.find((week) => week.start === "2026-10-12")?.state, "counted");
});

test("каникулы соединяют серию и сами в счёт не идут", () => {
  const stats = evaluateStreak(["2026-09-28", "2026-10-05", "2026-10-19"], ["2026-10-12"], sunday);
  assert.equal(stats.current, 3);
  assert.equal(stats.best, 3);
  assert.equal(stats.weeks.find((week) => week.start === "2026-10-12")?.state, "vacation");
  assert.deepEqual(stats.runStarts, ["2026-09-28", "2026-10-05", "2026-10-19"]);
});

test("после обрыва спокойная фраза, пока новая серия не началась", () => {
  const broken = evaluateStreak(["2026-09-21"], [], sunday);
  assert.equal(broken.current, 0);
  assert.equal(broken.best, 1);
  assert.equal(broken.freshStart, true);

  const never = evaluateStreak([], [], sunday);
  assert.equal(never.freshStart, false);
  assert.equal(never.weeks.length, 12);
});

test("бонус серии: 4, 8, 12 и каждые следующие 4", () => {
  assert.equal(streakBonus(3), null);
  assert.equal(streakBonus(4), 3);
  assert.equal(streakBonus(8), 5);
  assert.equal(streakBonus(12), 8);
  assert.equal(streakBonus(16), 3);
  assert.equal(streakBonus(20), 3);
  assert.deepEqual(
    streakMilestones(12).map((item) => [item.length, item.points]),
    [
      [4, 3],
      [8, 5],
      [12, 8],
    ],
  );
  assert.equal(weeksLabel(1), "1 неделя");
  assert.equal(weeksLabel(2), "2 недели");
  assert.equal(weeksLabel(5), "5 недель");
});

test("подсказка серии говорит про неделю и три действия ученика", () => {
  assert.match(STREAK_HINT, /за неделю/);
  assert.doesNotMatch(STREAK_HINT, /за день/);
  assert.match(STREAK_HINT, /Вы выполнили задание недели/);
  assert.match(STREAK_HINT, /основное задание/);
  assert.match(STREAK_HINT, /поработали над рукописью/);
  assert.match(STREAK_HINT, /понедельника по Москве/);
});

test("рукопись засчитывает неделю только при правке самого ученика", () => {
  const student = { role: "STUDENT", userId: "s1" };
  const mentor = { role: "MENTOR", userId: "m1" };
  assert.equal(studentManuscriptEditCounts(student, "s1", true), true);
  assert.equal(studentManuscriptEditCounts(student, "s1", false), false);
  assert.equal(studentManuscriptEditCounts(mentor, "s1", true), false);
  assert.equal(studentManuscriptEditCounts(student, "other", true), false);
});

test("анимация только для ещё не виденного хвоста серии", () => {
  const run = ["2026-10-05", "2026-10-12", "2026-10-19"];
  assert.equal(unseenRunWeeks(run, new Set()), 3);
  assert.equal(unseenRunWeeks(run, new Set(["2026-10-05"])), 2);
  assert.equal(unseenRunWeeks(run, new Set(run)), 0);
});
