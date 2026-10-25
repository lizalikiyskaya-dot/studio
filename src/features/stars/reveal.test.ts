import assert from "node:assert/strict";
import test from "node:test";
import { AUTHOR_RANKS } from "./rules";
import { unseenStarBeats } from "./reveal";

const RANKS_6 = [
  { min: 0, title: "Начинающий автор" },
  { min: 10, title: "Автор черновиков" },
  { min: 25, title: "Рассказчик" },
  { min: 45, title: "Мастер сцены" },
  { min: 70, title: "Романист" },
  { min: 100, title: "Достоевский" },
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

test("смена статуса открывает название по текущим 12 ступеням", () => {
  const earns = [
    { id: "base", points: 8 },
    { id: "chapter", points: 3 },
  ];
  const oldTable = unseenStarBeats(earns, new Set(["base"]), 11, RANKS_6);
  assert.equal(oldTable.length, 1);
  assert.equal(oldTable[0].levelUp, true);
  assert.equal(oldTable[0].rankBefore, "Начинающий автор");
  assert.equal(oldTable[0].rankAfter, "Автор черновиков");

  const current = unseenStarBeats(earns, new Set(["base"]), 11, AUTHOR_RANKS);
  assert.equal(current[0].levelUp, true);
  assert.equal(current[0].rankBefore, "Сочинитель");
  assert.equal(current[0].rankAfter, "Автор черновиков");

  const step = unseenStarBeats(
    [
      { id: "base", points: 14 },
      { id: "next", points: 3 },
    ],
    new Set(["base"]),
    17,
    AUTHOR_RANKS,
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
    RANKS_6,
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
