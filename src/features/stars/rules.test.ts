import assert from "node:assert/strict";
import test from "node:test";
import { AUTHOR_RANKS, chapterAwardsStars, mainTaskAwardsStars, rankForStars, starsLabel, submissionReadyForStars } from "./rules";

test("статус по сумме звёзд совпадает с порогами", () => {
  assert.equal(rankForStars(0).current.title, "Начинающий автор");
  assert.equal(rankForStars(9).current.title, "Начинающий автор");
  assert.equal(rankForStars(9).remaining, 1);
  assert.equal(rankForStars(10).current.title, "Автор черновиков");
  assert.equal(rankForStars(24).current.title, "Автор черновиков");
  assert.equal(rankForStars(25).current.title, "Рассказчик");
  assert.equal(rankForStars(44).current.title, "Рассказчик");
  assert.equal(rankForStars(45).current.title, "Мастер сцены");
  assert.equal(rankForStars(69).current.title, "Мастер сцены");
  assert.equal(rankForStars(70).current.title, "Романист");
  assert.equal(rankForStars(99).current.title, "Романист");
  assert.equal(rankForStars(100).current.title, "Достоевский");
  assert.equal(rankForStars(140).current.title, "Достоевский");
  assert.equal(rankForStars(140).next, null);
  assert.deepEqual(
    AUTHOR_RANKS.map((rank) => rank.min),
    [0, 10, 25, 45, 70, 100],
  );
});

test("склонение звёзд", () => {
  assert.equal(starsLabel(0), "0 звёздочек");
  assert.equal(starsLabel(1), "1 звёздочка");
  assert.equal(starsLabel(2), "2 звёздочки");
  assert.equal(starsLabel(5), "5 звёздочек");
  assert.equal(starsLabel(11), "11 звёздочек");
  assert.equal(starsLabel(21), "21 звёздочка");
  assert.equal(starsLabel(22), "22 звёздочки");
});

test("основное задание даёт звёзды за сдачу и принятие", () => {
  assert.equal(mainTaskAwardsStars("IN_PROGRESS"), false);
  assert.equal(mainTaskAwardsStars("NEEDS_REVISION"), false);
  assert.equal(mainTaskAwardsStars("SUBMITTED"), true);
  assert.equal(mainTaskAwardsStars("ACCEPTED"), true);
});

test("глава даёт звёзды только за статус «принята»", () => {
  assert.equal(chapterAwardsStars("IN_PROGRESS"), false);
  assert.equal(chapterAwardsStars("SUBMITTED"), false);
  assert.equal(chapterAwardsStars("IN_REVIEW"), false);
  assert.equal(chapterAwardsStars("NEEDS_REVISION"), false);
  assert.equal(chapterAwardsStars("ACCEPTED"), true);
});

test("конкурс и издательство: звёзды только после отметки «отправлено»", () => {
  assert.equal(submissionReadyForStars("NOT_SENT"), false);
  assert.equal(submissionReadyForStars("SENT"), true);
  assert.equal(submissionReadyForStars("WAITING"), true);
  assert.equal(submissionReadyForStars("ACCEPTED"), true);
  assert.equal(submissionReadyForStars("REJECTED"), true);
});
