import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { rankForStars } from "@/features/stars/rules";
import { findDestructive } from "../../../scripts/sql-guard.mjs";
import { STAR_POINTS } from "@/features/stars/rules";
import {
  confirmPurchase,
  listedPrice,
  METHODICAL_PRICE,
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

test("любая методичка стоит как три основных задания", () => {
  assert.equal(STAR_POINTS.MAIN_TASK, 3);
  assert.equal(METHODICAL_PRICE, STAR_POINTS.MAIN_TASK * 3);
  assert.equal(listedPrice(guide({ id: "a", title: "1 Писательская практика" })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "2 Луковица" })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "10 Крючки" })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "16 Синопсис" })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "7-1 Сценарные структуры" })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "19-2 Библия мира" })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "Новая методичка", fileBytes: 40_000 })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "Новая методичка", fileBytes: 2_000_000 })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "16 Синопсис", starPrice: 8 })), 9);
  assert.equal(listedPrice(guide({ id: "a", title: "16 Синопсис", starPrice: 18 })), 9);
});

test("закрытые методички покупаются по одной, открытая в список не входит", () => {
  const guides = [
    guide({ id: "g1", title: "1 Писательская практика", visible: true }),
    guide({ id: "g7a", title: "7-1 Сценарные структуры" }),
    guide({ id: "g7b", title: "7-2 Сценарные структуры", starPrice: 8 }),
    guide({ id: "g10", title: "10 Крючки" }),
  ];
  const offers = shopOffers(guides);
  assert.deepEqual(
    offers.map((offer) => [offer.id, offer.price, offer.guideIds]),
    [
      ["g7a", 9, ["g7a"]],
      ["g7b", 9, ["g7b"]],
      ["g10", 9, ["g10"]],
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
  assert.equal(single.price, 9);
  assert.equal(single.balanceAfter, 12);
  assert.equal(single.earned, earned);
  assert.equal(single.note, "методичка «2 Луковица»");
  assert.equal(rankForStars(single.earned).current.title, before);

  const other = planPurchase(guides, ["g7a"], 21, earned);
  assert.equal(other.ok, true);
  if (!other.ok) return;
  assert.equal(other.price, 9);
  assert.equal(other.sourceId, "g7a");
  assert.equal(other.balanceAfter, 12);

  const poor = planPurchase(guides, ["g2"], 5, earned);
  assert.deepEqual(poor, { ok: false, reason: "missing", missing: 4, price: 9 });

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
  assert.equal(shopIntro(), "Выберите методичку и откройте ее досрочно за звезды.");
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
