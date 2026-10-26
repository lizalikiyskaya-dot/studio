import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findDestructive, sortSqlNames } from "../../../../scripts/sql-guard.mjs";
import { STORY_CIRCLE_SEED } from "./seedData";
import { STORY_CIRCLE_STEP_KEYS } from "./steps";

const sql = fs.readFileSync("docs/sql/2026-10-27-story-circle-examples.sql", "utf8");

test("в круге Хармона три примера и у каждого восемь шагов", () => {
  assert.deepEqual(
    STORY_CIRCLE_SEED.map((seed) => seed.hero),
    ["Дороти (Волшебник страны Оз)", "Салли (Корпорация монстров)", "Марлин (В поисках Немо)"],
  );
  for (const seed of STORY_CIRCLE_SEED) {
    assert.deepEqual(Object.keys(seed.data), [...STORY_CIRCLE_STEP_KEYS]);
    for (const key of STORY_CIRCLE_STEP_KEYS) {
      assert.equal(seed.data[key], seed.data[key].trim());
      assert.ok(seed.data[key].length >= 40, `${seed.hero} / ${key}`);
      assert.equal(seed.data[key].includes("."), false, `${seed.hero} / ${key}`);
    }
  }
});

test("sql добавляет Салли и Марлина и не удаляет строки", () => {
  assert.equal(findDestructive(sql).length, 0);
  assert.equal(sql.includes("DELETE"), false);
  assert.match(sql, /ON CONFLICT \(id\) DO NOTHING/);
  assert.match(sql, /NOT EXISTS/);
  assert.equal(sql.includes("Дороти"), false);
  const sallyGo = STORY_CIRCLE_SEED.find((seed) => seed.hero.startsWith("Салли"))?.data.go;
  assert.equal(sallyGo, "через дверь в мир монстров попадает девочка Бу");
  for (const seed of STORY_CIRCLE_SEED.slice(1)) {
    assert.ok(sql.includes(seed.hero));
    for (const key of STORY_CIRCLE_STEP_KEYS) {
      // Файл уже применён на сервере, строку Салли в нём не меняем.
      const line = seed.hero.startsWith("Салли") && key === "go"
        ? "в его квартиру через дверь попадает девочка Бу"
        : seed.data[key];
      assert.ok(sql.includes(line), `${seed.hero} / ${key}`);
    }
  }
  const names = sortSqlNames([
    "2026-10-27-story-circle-examples.sql",
    "2026-10-26-9-daily-quote-order.sql",
    "2026-10-26-5-badges.sql",
  ]);
  assert.deepEqual(names, [
    "2026-10-26-5-badges.sql",
    "2026-10-26-9-daily-quote-order.sql",
    "2026-10-27-story-circle-examples.sql",
  ]);
});
