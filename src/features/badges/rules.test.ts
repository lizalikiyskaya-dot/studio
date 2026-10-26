import assert from "node:assert/strict";
import test from "node:test";
import { AUTHOR_RANKS } from "@/features/stars/rules";
import { BADGE_SECTIONS, BADGES } from "./catalogue";
import { badgeGroups, type BadgeView } from "./view";
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
    assert.equal(badge.hint, badge.hintFormal);
    assert.equal(badge.hint.includes("сдала"), false);
    assert.equal(/(^|[^А-Яа-яЁё])(ты|тебе|тебя|твой|твоя)([^А-Яа-яЁё]|$)/.test(badge.hint), false);
    assert.equal(/^(Сдай|Набери|Дождись|Прими|Заверши|Держи|Отправь|Получи) /.test(badge.hint), false);
  }
});

test("уровни значков совпадают со ступенями автора", () => {
  for (const badge of BADGES.filter((item) => item.progress?.kind === "stars")) {
    assert.ok(AUTHOR_RANKS.some((rank) => rank.min === badge.progress?.total && rank.title === badge.title));
  }
});

test("подсказка значка одна для всех: «Вы» и множественное наклонение", () => {
  const page = BADGES.find((badge) => badge.id === "first-page");
  const chapter = BADGES.find((badge) => badge.id === "first-chapter");
  const level = BADGES.find((badge) => badge.id === "level-25");
  assert.ok(page && chapter && level);
  assert.equal(hintFor(page), "Сдайте первое основное задание.");
  assert.equal(hintFor(chapter), "Дождитесь статуса «принята» у первой главы.");
  assert.equal(hintFor(level), "Наберите 25 звёзд в «заработано» — статус «Рассказчик».");
  assert.equal(galleryLead(), "Цветной значок уже Ваш. Серый ещё можно получить: под ним написано, что для этого нужно.");
  assert.equal(galleryLead().includes("твой"), false);
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
  for (const id of ["ten-tasks", "lighthouse", "level-25", "level-70", "ten-thousand", "second-draft", "book-done", "back-in-line", "publisher-yes"]) {
    assert.equal(ids.includes(id), false, id);
  }
  assert.deepEqual(missingAutoBadgeIds(ids, ["first-page", "spark"]), ids.filter((id) => id !== "first-page" && id !== "spark"));
});

test("журнал остаётся конкурсом, издательство принято отдельно", () => {
  const contest = BADGES.find((badge) => badge.id === "contest-yes");
  const publisher = BADGES.find((badge) => badge.id === "publisher-yes");
  assert.ok(contest && publisher);
  assert.equal(contest.section, "contest");
  assert.equal(publisher.section, "contest");
  assert.equal(contest.title, "Публикация");
  assert.equal(publisher.title, "Контракт");
  const entry = BADGES.find((badge) => badge.id === "first-entry");
  assert.ok(entry);
  assert.equal(hintFor(entry), "Отправьте первую заявку в журнал или на конкурс.");
  assert.equal(hintFor(contest), "Получите публикацию в журнале или победу на конкурсе.");
  assert.equal(hintFor(publisher), "Получите контракт с издательством.");

  const journal = emptyBadgeFacts();
  journal.contestAccepted = true;
  const journalIds = autoBadgeIds(journal);
  assert.ok(journalIds.includes("contest-yes"));
  assert.equal(journalIds.includes("publisher-yes"), false);

  const journalSent = emptyBadgeFacts();
  journalSent.contestSent = true;
  const journalSentIds = autoBadgeIds(journalSent);
  assert.ok(journalSentIds.includes("first-entry"));
  assert.equal(journalSentIds.includes("publisher"), false);

  const sent = emptyBadgeFacts();
  sent.publisherSent = true;
  const sentIds = autoBadgeIds(sent);
  assert.ok(sentIds.includes("publisher"));
  assert.equal(sentIds.includes("first-entry"), false);
  assert.equal(sentIds.includes("publisher-yes"), false);

  const accepted = emptyBadgeFacts();
  accepted.publisherSent = true;
  accepted.publisherAccepted = true;
  assert.ok(autoBadgeIds(accepted).includes("publisher"));
  assert.ok(autoBadgeIds(accepted).includes("publisher-yes"));
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

test("подсказки методичек и ручных значков без «Значок ставит Лиза»", () => {
  const onion = BADGES.find((badge) => badge.id === "methodical-2");
  const longText = BADGES.find((badge) => badge.id === "ten-thousand");
  const rewrite = BADGES.find((badge) => badge.id === "second-draft");
  assert.ok(onion && longText && rewrite);
  assert.equal(hintFor(onion), "Выполните задание по методичке «2 Луковица» и получите отметку «принято».");
  assert.equal(onion.hint, onion.hintFormal);
  assert.equal(hintFor(longText), "Напишите текст от 10 000 знаков.");
  assert.equal(hintFor(rewrite), "Перепишите текст после разбора.");
  for (const badge of BADGES) {
    assert.equal(badge.hint.includes("Значок ставит Лиза"), false);
    assert.equal(badge.hintFormal.includes("Значок ставит Лиза"), false);
  }
});

test("разделы значков: старт, уровни, серии, практика, методички, конкурсы", () => {
  assert.deepEqual(
    BADGE_SECTIONS.map((section) => section.label),
    ["Старт", "Уровни", "Серии", "Практика", "Методички", "Конкурсы и публикации"],
  );
  const views: BadgeView[] = BADGES.map((badge) => ({
    id: badge.id,
    title: badge.title,
    hint: badge.hint,
    image: badge.image,
    section: badge.section,
    sortOrder: badge.sortOrder,
    earned: false,
    awardId: null,
    awardedAt: null,
    awardedLabel: null,
    source: null,
    progressLabel: null,
  }));
  assert.deepEqual(
    badgeGroups(views).map((group) => group.id),
    ["start", "level", "streak", "practice", "methodical", "contest"],
  );
  const sectionOrder = ["start", "level", "streak", "practice", "methodical", "contest"];
  let previous = -1;
  for (const section of sectionOrder) {
    const orders = BADGES.filter((badge) => badge.section === section).map((badge) => badge.sortOrder);
    const min = Math.min(...orders);
    const max = Math.max(...orders);
    assert.ok(min > previous, section);
    previous = max;
  }
  const locked = widgetBadges(views.map((badge) => ({ ...badge, earned: false, awardedAt: null })));
  assert.deepEqual(
    locked.map((badge) => badge.id),
    ["first-page", "first-week", "first-chapter"],
  );
});
