import assert from "node:assert/strict";
import test from "node:test";
import { AUTHOR_RANKS } from "./rules";
import { unseenStarBeats } from "./reveal";

const RANKS_12 = [
  { min: 0, title: "Начинающий автор" },
  { min: 5, title: "Сочинитель" },
  { min: 10, title: "Автор черновиков" },
  { min: 17, title: "Автор первой главы" },
  { min: 25, title: "Рассказчик" },
  { min: 35, title: "Мастер диалога" },
  { min: 45, title: "Мастер сцены" },
  { min: 57, title: "Архитектор сюжета" },
  { min: 70, title: "Романист" },
  { min: 85, title: "Автор рукописи" },
  { min: 100, title: "Достоевский" },
  { min: 150, title: "Живой классик" },
] as const;

test("новые звёзды без смены статуса — один полёт", () => {
  const beats = unseenStarBeats(
    [
      { id: "old", points: 12 },
      { id: "new", points: 3 },
    ],
    new Set(["old"]),
    15,
    AUTHOR_RANKS,
  );
  assert.equal(beats.length, 1);
  assert.equal(beats[0].levelUp, false);
  assert.deepEqual(beats[0].ids, ["new"]);
  assert.equal(beats[0].from, 12);
  assert.equal(beats[0].to, 15);
  assert.equal(beats[0].rankBefore, "Автор черновиков");
  assert.equal(beats[0].rankAfter, "Автор черновиков");
});

test("смена статуса открывает название и на 6, и на 12 ступенях", () => {
  const earns = [
    { id: "base", points: 8 },
    { id: "chapter", points: 3 },
  ];
  const six = unseenStarBeats(earns, new Set(["base"]), 11, AUTHOR_RANKS);
  assert.equal(six.length, 1);
  assert.equal(six[0].levelUp, true);
  assert.equal(six[0].rankBefore, "Начинающий автор");
  assert.equal(six[0].rankAfter, "Автор черновиков");

  const twelve = unseenStarBeats(earns, new Set(["base"]), 11, RANKS_12);
  assert.equal(twelve[0].levelUp, true);
  assert.equal(twelve[0].rankBefore, "Сочинитель");
  assert.equal(twelve[0].rankAfter, "Автор черновиков");

  const step = unseenStarBeats(
    [
      { id: "base", points: 14 },
      { id: "next", points: 3 },
    ],
    new Set(["base"]),
    17,
    RANKS_12,
  );
  assert.equal(step[0].levelUp, true);
  assert.equal(step[0].rankAfter, "Автор первой главы");
  assert.equal(unseenStarBeats(
    [
      { id: "base", points: 14 },
      { id: "next", points: 3 },
    ],
    new Set(["base"]),
    17,
    AUTHOR_RANKS,
  )[0].levelUp, false);
});

test("уже виденные строки не летят снова", () => {
  const beats = unseenStarBeats(
    [{ id: "a", points: 3 }],
    new Set(["a"]),
    3,
    AUTHOR_RANKS,
  );
  assert.deepEqual(beats, []);
});
