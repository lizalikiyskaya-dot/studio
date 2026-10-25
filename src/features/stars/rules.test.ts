import assert from "node:assert/strict";
import test from "node:test";
import { AUTHOR_RANKS, chapterAwardsStars, mainTaskAwardsStars, rankForStars, rankProgressLine, starsLabel, submissionReadyForStars } from "./rules";

test("статус по сумме звёзд совпадает с порогами", () => {
  assert.equal(rankForStars(0).current.title, "Начинающий автор");
  assert.equal(rankForStars(4).current.title, "Начинающий автор");
  assert.equal(rankForStars(5).current.title, "Сочинитель");
  assert.equal(rankForStars(9).current.title, "Сочинитель");
  assert.equal(rankForStars(10).current.title, "Автор черновиков");
  assert.equal(rankForStars(16).current.title, "Автор черновиков");
  assert.equal(rankForStars(17).current.title, "Автор первой главы");
  assert.equal(rankForStars(24).current.title, "Автор первой главы");
  assert.equal(rankForStars(25).current.title, "Рассказчик");
  assert.equal(rankForStars(34).current.title, "Рассказчик");
  assert.equal(rankForStars(35).current.title, "Мастер диалога");
  assert.equal(rankForStars(44).current.title, "Мастер диалога");
  assert.equal(rankForStars(45).current.title, "Мастер сцены");
  assert.equal(rankForStars(56).current.title, "Мастер сцены");
  assert.equal(rankForStars(57).current.title, "Архитектор сюжета");
  assert.equal(rankForStars(69).current.title, "Архитектор сюжета");
  assert.equal(rankForStars(70).current.title, "Романист");
  assert.equal(rankForStars(84).current.title, "Романист");
  assert.equal(rankForStars(85).current.title, "Автор рукописи");
  assert.equal(rankForStars(99).current.title, "Автор рукописи");
  assert.equal(rankForStars(100).current.title, "Достоевский");
  assert.equal(rankForStars(149).current.title, "Достоевский");
  assert.equal(rankForStars(150).current.title, "Живой классик");
  assert.equal(rankForStars(180).current.title, "Живой классик");
  assert.equal(rankForStars(180).next, null);
  assert.deepEqual(
    AUTHOR_RANKS.map((rank) => rank.min),
    [0, 5, 10, 17, 25, 35, 45, 57, 70, 85, 100, 150],
  );
});

test("строка «до статуса … ещё N»", () => {
  assert.equal(rankProgressLine(4), "до статуса «Сочинитель» ещё 1 звёздочка");
  assert.equal(rankProgressLine(9), "до статуса «Автор черновиков» ещё 1 звёздочка");
  assert.equal(rankForStars(9).remaining, 1);
  assert.equal(rankProgressLine(21), "до статуса «Рассказчик» ещё 4 звёздочки");
  assert.equal(rankProgressLine(149), "до статуса «Живой классик» ещё 1 звёздочка");
  assert.equal(rankProgressLine(150), "высший статус");
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
