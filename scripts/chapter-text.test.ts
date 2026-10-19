import assert from "node:assert/strict";
import test from "node:test";
import { chapterTitle, foldedDescription, formatChars, parseChars, progressKind, progressPercent } from "../src/features/acts/chapterText";

const empty = { description: "", summary: "", dramaticArgument: "", note: "", images: "" };

test("tracker texts land in the plan description and survive a second fold", () => {
  const once = foldedDescription({
    ...empty,
    summary: "Герой входит в город",
    dramaticArgument: "Ему некуда вернуться",
    note: "Дописать дождь",
    images: "Мокрый плащ",
  }, ["Сцена у ворот"]);
  assert.match(once, /Герой входит в город/);
  assert.match(once, /Ядро\nЕму некуда вернуться/);
  assert.match(once, /Примечание\nДописать дождь/);
  assert.match(once, /Образы\nМокрый плащ/);
  assert.match(once, /Сцена у ворот/);

  const twice = foldedDescription({ ...empty, description: once, summary: "Герой входит в город", dramaticArgument: "Ему некуда вернуться", note: "Дописать дождь", images: "Мокрый плащ" }, ["Сцена у ворот"]);
  assert.equal(twice, once);
});

test("an existing description keeps tracker text that is not already inside", () => {
  const next = foldedDescription({
    ...empty,
    description: "Короткое описание из плана",
    summary: "Суть из трекера",
    dramaticArgument: "",
    note: "",
  });
  assert.match(next, /Короткое описание из плана/);
  assert.match(next, /Суть из трекера/);
});

test("chapter title prefers the plan name, then the tracker line", () => {
  assert.equal(chapterTitle("Уже задано", "Из плана", "Из трекера"), "Уже задано");
  assert.equal(chapterTitle("", "Из плана", "Из трекера"), "Из плана");
  assert.equal(chapterTitle("  ", "", "Первая строка\nвторая"), "Первая строка");
});

test("character counts use a regular space as the thousands separator", () => {
  assert.equal(formatChars(12000), "12 000");
  assert.equal(formatChars(0), "0");
  assert.equal(parseChars("12 000"), 12000);
  assert.equal(parseChars("12\u00A0000"), 12000);
});

test("progress brackets match the calm palette", () => {
  assert.equal(progressKind(0, 1000), "none");
  assert.equal(progressKind(100, 0), "none");
  assert.equal(progressKind(69, 100), "work");
  assert.equal(progressKind(70, 100), "almost");
  assert.equal(progressKind(100, 100), "done");
  assert.equal(progressKind(140, 100), "done");
  assert.equal(progressPercent(70, 100), 70);
  assert.equal(progressPercent(0, 0), 0);
});
