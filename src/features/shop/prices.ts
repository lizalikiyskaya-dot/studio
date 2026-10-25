import { matchKeyMethodical } from "@/features/badges/rules";
import { ruPlural } from "@/features/stars/rules";

/** Три цены магазина. Других нет. */
export const STAR_PRICE_OPTIONS = [8, 12, 18] as const;
export type StarPrice = (typeof STAR_PRICE_OPTIONS)[number];

/**
 * Цены из согласованной таблицы. 7-1 с 7-2 и 19-1 с 19-2 в магазине
 * продаются парой за 18, если наставник не задал цену каждой отдельно.
 */
const CATALOG: Record<string, StarPrice> = {
  "1": 8,
  "2": 12,
  "3": 12,
  "4": 8,
  "5": 12,
  "6": 12,
  "7-1": 18,
  "7-2": 18,
  "8": 12,
  "9": 12,
  "10": 8,
  "11": 12,
  "12": 12,
  "13": 12,
  "14": 8,
  "15": 8,
  "16": 18,
  "17": 18,
  "18": 12,
  "19-1": 18,
  "19-2": 18,
};

const PAIRS: { sourceId: string; codes: [string, string]; price: StarPrice }[] = [
  { sourceId: "pair:7", codes: ["7-1", "7-2"], price: 18 },
  { sourceId: "pair:19", codes: ["19-1", "19-2"], price: 18 },
];

const SHORT_FILE = 150_000;
const LONG_FILE = 1_500_000;

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
  price: StarPrice;
  bundled: boolean;
};

export function isStarPrice(value: number | null | undefined): value is StarPrice {
  return value === 8 || value === 12 || value === 18;
}

export function guideCode(title: string): string | null {
  return matchKeyMethodical(title)?.code ?? null;
}

/** Цена одной методички: явная, иначе таблица, иначе размер файла. */
export function listedPrice(guide: Pick<ShopGuide, "title" | "starPrice" | "fileBytes">): StarPrice {
  if (isStarPrice(guide.starPrice)) return guide.starPrice;
  const code = guideCode(guide.title);
  if (code && CATALOG[code]) return CATALOG[code];
  const bytes = guide.fileBytes ?? 0;
  if (bytes >= LONG_FILE) return 18;
  if (bytes > 0 && bytes < SHORT_FILE) return 8;
  return 12;
}

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sorted = [...right].sort();
  return [...left].sort().every((id, index) => id === sorted[index]);
}

/**
 * В магазине только закрытые методички. Пара 7 и пара 19 — одна карточка за 18,
 * пока наставник не поставил свою цену хотя бы одной из них.
 */
export function shopOffers(guides: ShopGuide[]): ShopOffer[] {
  const closed = guides.filter((guide) => !guide.visible);
  const consumed = new Set<string>();
  const offers: ShopOffer[] = [];

  for (const guide of closed) {
    if (consumed.has(guide.id)) continue;
    const code = guideCode(guide.title);
    const pair = PAIRS.find((item) => item.codes.includes(code ?? ""));
    if (pair) {
      const members = pair.codes
        .map((item) => closed.find((candidate) => !consumed.has(candidate.id) && guideCode(candidate.title) === item))
        .filter((candidate): candidate is ShopGuide => Boolean(candidate));
      const hasBoth = pair.codes.every((item) => members.some((candidate) => guideCode(candidate.title) === item));
      const overridden = members.some((candidate) => isStarPrice(candidate.starPrice));
      if (hasBoth && !overridden) {
        for (const member of members) consumed.add(member.id);
        offers.push({
          id: pair.sourceId,
          guideIds: members.map((member) => member.id),
          titles: members.map((member) => member.title || "Методичка"),
          description: members
            .map((member) => member.description.trim())
            .filter(Boolean)
            .join("\n\n"),
          price: pair.price,
          bundled: true,
        });
        continue;
      }
    }
    consumed.add(guide.id);
    offers.push({
      id: guide.id,
      guideIds: [guide.id],
      titles: [guide.title || "Методичка"],
      description: guide.description.trim(),
      price: listedPrice(guide),
      bundled: false,
    });
  }

  return offers;
}

export type PurchasePlan =
  | {
      ok: true;
      price: StarPrice;
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
  return "Выберите методичку и откройте её за звёзды со счёта. Уровень от этого не меняется. Если методичка есть в плане, Лиза открывает её сама.";
}

export function openedLine(titles: string[]): string {
  if (titles.length > 1) return "Вы открыли методички. Они в разделе «Материалы».";
  const title = titles[0] ? ` «${titles[0]}»` : "";
  return `Вы открыли методичку${title}. Она в разделе «Материалы».`;
}
