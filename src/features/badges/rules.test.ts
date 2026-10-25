import assert from "node:assert/strict";
import test from "node:test";
import { AUTHOR_RANKS } from "@/features/stars/rules";
import { BADGES } from "./catalogue";
import {
  autoBadgeIds,
  badgesStillOpen,
  emptyBadgeFacts,
  galleryLead,
  hintFor,
  matchKeyMethodical,
  methodicalBadgeIdsForTitles,
  missingAutoBadgeIds,
  returnedAfterBreak,
  widgetBadges,
  widgetLine,
} from "./rules";

test("в справочнике свои рисунки и нет двух одинаковых id", () => {
  const ids = BADGES.map((badge) => badge.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(BADGES.filter((badge) => badge.section === "methodical" && badge.code).length, 21);
  assert.ok(BADGES.length >= 35);
  assert.ok(BADGES.length <= 45);
  for (const badge of BADGES) {
    assert.equal(badge.image, `/badges/${badge.id}.png`);
    assert.equal(badge.hint.includes("сдала"), false);
    assert.equal(badge.hintFormal.includes("сдала"), false);
  }
});

test("уровни значков совпадают со ступенями автора", () => {
  for (const badge of BADGES.filter((item) => item.progress?.kind === "stars")) {
    assert.ok(AUTHOR_RANKS.some((rank) => rank.min === badge.progress?.total && rank.title === badge.title));
  }
});

test("Виктории в подсказке «Вы» и множественное наклонение", () => {
  const page = BADGES.find((badge) => badge.id === "first-page");
  const chapter = BADGES.find((badge) => badge.id === "first-chapter");
  const level = BADGES.find((badge) => badge.id === "level-25");
  assert.ok(page && chapter && level);
  assert.match(hintFor(page, false), /^Сдай /);
  assert.match(hintFor(page, true), /^Сдайте /);
  assert.match(hintFor(chapter, false), /Дождись/);
  assert.match(hintFor(chapter, true), /Дождитесь/);
  assert.match(hintFor(level, false), /Набери 25/);
  assert.match(hintFor(level, true), /Наберите 25/);
  assert.match(galleryLead(false), /уже твой/);
  assert.match(galleryLead(true), /уже Ваш/);
  assert.equal(galleryLead(true).includes("твоя"), false);
});

test("номер 1 не цепляет методички 10 и 19-1", () => {
  assert.equal(matchKeyMethodical("10 Крючки")?.id, "methodical-10");
  assert.equal(matchKeyMethodical("19-1 Библия мира")?.id, "methodical-19-1");
  assert.equal(matchKeyMethodical("1 Писательская практика")?.id, "methodical-1");
  assert.equal(matchKeyMethodical("Писательская практика")?.id, "methodical-1");
  assert.equal(matchKeyMethodical("Глава 1")?.id ?? null, null);
  assert.equal(matchKeyMethodical("методичка 7-1")?.id, "methodical-7-1");
  assert.deepEqual(methodicalBadgeIdsForTitles(["7-2 Сценарные структуры", "про арку"]), ["methodical-7-2"]);
});

test("перерыв в три недели даёт «Снова в строю», каникулы не считаются", () => {
  assert.equal(returnedAfterBreak(["2026-10-05", "2026-11-02"], []), true);
  assert.equal(returnedAfterBreak(["2026-10-05", "2026-10-26"], []), false);
  assert.equal(
    returnedAfterBreak(["2026-10-05", "2026-11-02"], ["2026-10-12", "2026-10-19", "2026-10-26"]),
    false,
  );
});

test("автоматические значки: глава, серия, уровень; ручные сами не встают", () => {
  const facts = emptyBadgeFacts();
  facts.submittedTasks = 1;
  facts.acceptedChapters = 1;
  facts.weeklySubmissions = 1;
  facts.earnedStars = 21;
  facts.streakBest = 8;
  facts.countedWeeks = ["2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"];
  facts.contestSent = true;
  const ids = autoBadgeIds(facts);
  for (const id of ["first-page", "first-week", "first-chapter", "spark", "candle", "first-entry", "level-5"]) {
    assert.ok(ids.includes(id), id);
  }
  for (const id of ["ten-tasks", "lighthouse", "level-25", "level-70", "ten-thousand", "second-draft", "book-done", "back-in-line"]) {
    assert.equal(ids.includes(id), false, id);
  }
  assert.deepEqual(missingAutoBadgeIds(ids, ["first-page", "spark"]), ids.filter((id) => id !== "first-page" && id !== "spark"));
});

test("виджет берёт три последних и считает, сколько ещё можно получить", () => {
  const items = [
    { id: "a", earned: true, awardedAt: "2026-10-01", sortOrder: 1 },
    { id: "b", earned: true, awardedAt: "2026-10-20", sortOrder: 2 },
    { id: "c", earned: false, awardedAt: null, sortOrder: 3 },
    { id: "d", earned: true, awardedAt: "2026-10-10", sortOrder: 4 },
  ];
  assert.deepEqual(widgetBadges(items).map((item) => item.id), ["b", "d", "a"]);
  assert.equal(widgetLine(12), "Ещё 12 можно получить");
  assert.equal(widgetLine(0), "Все значки уже получены");
  assert.equal(badgesStillOpen(41, 4), 37);
});
