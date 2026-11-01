import { ruPlural, STAR_POINTS } from "@/features/stars/rules";

/** Явная цена наставника больше не выбирает сумму. Поле в базе остаётся. */
export const STAR_PRICE_OPTIONS = [8, 12, 18] as const;
export type StarPrice = (typeof STAR_PRICE_OPTIONS)[number];

/**
 * Одна цена на любую методичку: три основных задания.
 * Основное задание даёт STAR_POINTS.MAIN_TASK звёзд.
 */
export const METHODICAL_PRICE = STAR_POINTS.MAIN_TASK * 3;

export type ShopGuide = {
  id: string;
  title: string;
  description: string;
  starPrice: number | null;
  fileBytes: number | null;
  visible: boolean;
};

export type ShopOffer = {
  id: string;
  guideIds: string[];
  titles: string[];
  description: string;
  price: number;
  bundled: boolean;
};

export function isStarPrice(value: number | null | undefined): value is StarPrice {
  return value === 8 || value === 12 || value === 18;
}

/** Любая методичка стоит одинаково. Номер, размер файла и старая цена наставника не влияют. */
export function listedPrice(_guide?: Pick<ShopGuide, "title" | "starPrice" | "fileBytes">): number {
  return METHODICAL_PRICE;
}

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sorted = [...right].sort();
  return [...left].sort().every((id, index) => id === sorted[index]);
}

/** Закрытые методички. Каждая покупается отдельно и стоит одинаково. */
export function shopOffers(guides: ShopGuide[]): ShopOffer[] {
  return guides
    .filter((guide) => !guide.visible)
    .map((guide) => ({
      id: guide.id,
      guideIds: [guide.id],
      titles: [guide.title || "Методичка"],
      description: guide.description.trim(),
      price: METHODICAL_PRICE,
      bundled: false,
    }));
}

export type PurchasePlan =
  | {
      ok: true;
      price: number;
      guideIds: string[];
      sourceId: string;
      note: string;
      balanceAfter: number;
      earned: number;
    }
  | { ok: false; reason: "missing"; missing: number; price: number }
  | { ok: false; reason: "open" | "unknown" };

/** Что записать в журнал. «Заработано» не меняется. */
export function planPurchase(guides: ShopGuide[], guideIds: string[], balance: number, earned: number): PurchasePlan {
  const ids = [...new Set(guideIds)];
  const offer = shopOffers(guides).find((item) => sameIds(item.guideIds, ids));
  if (!offer) {
    const found = ids.map((id) => guides.find((guide) => guide.id === id));
    if (found.some((guide) => !guide)) return { ok: false, reason: "unknown" };
    if (found.every((guide) => guide?.visible)) return { ok: false, reason: "open" };
    return { ok: false, reason: "unknown" };
  }
  if (balance < offer.price) {
    return { ok: false, reason: "missing", missing: offer.price - balance, price: offer.price };
  }
  const quoted = offer.titles.map((title) => `«${title}»`).join(" и ");
  const note = offer.titles.length > 1 ? `методички ${quoted}` : `методичка ${quoted}`;
  return {
    ok: true,
    price: offer.price,
    guideIds: offer.guideIds,
    sourceId: offer.id,
    note,
    balanceAfter: balance - offer.price,
    earned,
  };
}

function starsFor(n: number, form: "nom" | "acc" | "gen"): string {
  const word =
    form === "acc"
      ? ruPlural(n, "звезду", "звезды", "звёзд")
      : form === "gen"
        ? ruPlural(n, "звезды", "звёзд", "звёзд")
        : ruPlural(n, "звезда", "звезды", "звёзд");
  return `${n} ${word}`;
}

export function confirmPurchase(price: number, balanceAfter: number, titles: string[]): string {
  const what = titles.length > 1 ? `методички ${titles.map((title) => `«${title}»`).join(" и ")}` : "методичку";
  return `Открыть ${what} за ${starsFor(price, "acc")}? На счету останется ${starsFor(balanceAfter, "nom")}.`;
}

export function missingStarsLabel(missing: number): string {
  return `Не хватает ${starsFor(missing, "gen")}`;
}

export function shopIntro(): string {
  return "Выберите методичку и откройте ее досрочно за звезды.";
}

export function openedLine(titles: string[]): string {
  if (titles.length > 1) return "Вы открыли методички. Они в разделе «Материалы».";
  const title = titles[0] ? ` «${titles[0]}»` : "";
  return `Вы открыли методичку${title}. Она в разделе «Материалы».`;
}
