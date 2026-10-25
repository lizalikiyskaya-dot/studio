import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { rankForStars } from "@/features/stars/rules";
import { findDestructive } from "../../../scripts/sql-guard.mjs";
import {
  confirmPurchase,
  listedPrice,
  missingStarsLabel,
  openedLine,
  planPurchase,
  shopIntro,
  shopOffers,
  type ShopGuide,
} from "./prices";

const root = process.cwd();

function guide(partial: Partial<ShopGuide> & Pick<ShopGuide, "id" | "title">): ShopGuide {
  return {
    description: "",
    starPrice: null,
    fileBytes: null,
    visible: false,
    ...partial,
  };
}

test("таблица цен и размер файла", () => {
  assert.equal(listedPrice(guide({ id: "a", title: "1 Писательская практика" })), 8);
  assert.equal(listedPrice(guide({ id: "a", title: "Писательская практика" })), 8);
  assert.equal(listedPrice(guide({ id: "a", title: "2 Луковица" })), 12);
  assert.equal(listedPrice(guide({ id: "a", title: "16 Синопсис" })), 18);
  assert.equal(listedPrice(guide({ id: "a", title: "7-1 Сценарные структуры" })), 18);
  assert.equal(listedPrice(guide({ id: "a", title: "19-2 Библия мира" })), 18);
  assert.equal(listedPrice(guide({ id: "a", title: "Новая методичка", fileBytes: 40_000 })), 8);
  assert.equal(listedPrice(guide({ id: "a", title: "Новая методичка", fileBytes: 400_000 })), 12);
  assert.equal(listedPrice(guide({ id: "a", title: "Новая методичка", fileBytes: 2_000_000 })), 18);
  assert.equal(listedPrice(guide({ id: "a", title: "Новая методичка", fileBytes: null })), 12);
  assert.equal(listedPrice(guide({ id: "a", title: "16 Синопсис", starPrice: 8 })), 8);
});

test("закрытые методички, пара за 18, открытая Лизой в магазин не входит", () => {
  const guides = [
    guide({ id: "g1", title: "1 Писательская практика", visible: true }),
    guide({ id: "g7a", title: "7-1 Сценарные структуры" }),
    guide({ id: "g7b", title: "7-2 Сценарные структуры" }),
    guide({ id: "g10", title: "10 Крючки" }),
    guide({ id: "g19a", title: "19-1 Библия мира", visible: true }),
    guide({ id: "g19b", title: "19-2 Библия мира" }),
  ];
  const offers = shopOffers(guides);
  assert.deepEqual(
    offers.map((offer) => [offer.id, offer.price, offer.guideIds]),
    [
      ["pair:7", 18, ["g7a", "g7b"]],
      ["g10", 8, ["g10"]],
      ["g19b", 18, ["g19b"]],
    ],
  );
});

test("своя цена наставника разбивает пару", () => {
  const offers = shopOffers([
    guide({ id: "g7a", title: "7-1 Сценарные структуры", starPrice: 8 }),
    guide({ id: "g7b", title: "7-2 Сценарные структуры" }),
  ]);
  assert.deepEqual(
    offers.map((offer) => [offer.id, offer.price]),
    [
      ["g7a", 8],
      ["g7b", 18],
    ],
  );
});

test("покупка уменьшает счёт и не трогает заработано и уровень", () => {
  const guides = [
    guide({ id: "g2", title: "2 Луковица" }),
    guide({ id: "g7a", title: "7-1 Сценарные структуры" }),
    guide({ id: "g7b", title: "7-2 Сценарные структуры" }),
  ];
  const earned = 21;
  const before = rankForStars(earned).current.title;
  const single = planPurchase(guides, ["g2"], 21, earned);
  assert.equal(single.ok, true);
  if (!single.ok) return;
  assert.equal(single.price, 12);
  assert.equal(single.balanceAfter, 9);
  assert.equal(single.earned, earned);
  assert.equal(single.note, "методичка «2 Луковица»");
  assert.equal(rankForStars(single.earned).current.title, before);

  const pair = planPurchase(guides, ["g7b", "g7a"], 21, earned);
  assert.equal(pair.ok, true);
  if (!pair.ok) return;
  assert.equal(pair.price, 18);
  assert.equal(pair.sourceId, "pair:7");
  assert.equal(pair.balanceAfter, 3);
  assert.equal(pair.earned, earned);
  assert.match(pair.note, /методички/);

  const poor = planPurchase(guides, ["g2"], 5, earned);
  assert.deepEqual(poor, { ok: false, reason: "missing", missing: 7, price: 12 });

  const opened = planPurchase([{ ...guides[0], visible: true }], ["g2"], 21, earned);
  assert.deepEqual(opened, { ok: false, reason: "open" });
});

test("тексты магазина на «Вы»", () => {
  assert.equal(
    confirmPurchase(12, 9, ["2 Луковица"]),
    "Открыть методичку за 12 звёзд? На счету останется 9 звёзд.",
  );
  assert.equal(
    confirmPurchase(18, 3, ["7-1 Сценарные структуры", "7-2 Сценарные структуры"]),
    "Открыть методички «7-1 Сценарные структуры» и «7-2 Сценарные структуры» за 18 звёзд? На счету останется 3 звезды.",
  );
  assert.equal(missingStarsLabel(1), "Не хватает 1 звезды");
  assert.equal(missingStarsLabel(3), "Не хватает 3 звёзд");
  assert.equal(missingStarsLabel(7), "Не хватает 7 звёзд");
  assert.match(shopIntro(), /Выберите методичку и откройте её/);
  assert.doesNotMatch(shopIntro(), /открой её|Выбери /);
  assert.match(openedLine(["Луковица"]), /^Вы открыли методичку «Луковица»/);
  assert.match(openedLine(["7-1", "7-2"]), /^Вы открыли методички/);
});

test("sql магазина только добавляет цену и вид траты", () => {
  const sql = fs.readFileSync(path.join(root, "docs/sql/2026-10-26-7-guide-shop.sql"), "utf8");
  assert.equal(findDestructive(sql).length, 0);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "starPrice"/);
  assert.match(sql, /ADD VALUE 'GUIDE'/);
  assert.equal(sql.includes("INSERT"), false);
  assert.equal(sql.includes("UPDATE"), false);
  const actions = fs.readFileSync(path.join(root, "src/features/shop/actions.ts"), "utf8");
  assert.match(actions, /direction:\s*"SPEND"/);
  assert.match(actions, /kind:\s*"GUIDE"/);
  assert.match(actions, /pg_advisory_xact_lock/);
  assert.doesNotMatch(actions, /notifyStudentGuideOpened/);
  assert.doesNotMatch(actions, /awardStars/);
});
