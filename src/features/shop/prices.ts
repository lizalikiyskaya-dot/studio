import { matchKeyMethodical } from "@/features/badges/rules";
import { ruPlural } from "@/features/stars/rules";

/** Явная цена наставника. Лестница по номеру этими тремя не ограничена. */
export const STAR_PRICE_OPTIONS = [8, 12, 18] as const;
export type StarPrice = (typeof STAR_PRICE_OPTIONS)[number];

/**
 * Лестница по номеру. Тихая неделя — 5 звёзд (задание недели 2 и основное 3).
 * №1 стоит 8: примерно полторы таких недели, счёт в 21 звезду её покрывает.
 * Каждый следующий номер — на одну звезду дороже. 7-1 и 7-2 делят цену номера 7,
 * 19-1 и 19-2 — цену номера 19. В магазине такая пара по-прежнему одна карточка.
 */
export const METHODICAL_PRICE_START = 8;

const PAIRS: { sourceId: string; codes: [string, string] }[] = [
  { sourceId: "pair:7", codes: ["7-1", "7-2"] },
  { sourceId: "pair:19", codes: ["19-1", "19-2"] },
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
  price: number;
  bundled: boolean;
};

export function isStarPrice(value: number | null | undefined): value is StarPrice {
  return value === 8 || value === 12 || value === 18;
}

export function guideCode(title: string): string | null {
  return matchKeyMethodical(title)?.code ?? null;
}

/** Старший номер: «7-1» и «7-2» — это 7, «19-2» — это 19. */
export function methodicalNumber(code: string | null | undefined): number | null {
  if (!code) return null;
  const major = Number.parseInt(code, 10);
  if (!Number.isInteger(major) || major < 1) return null;
  return major;
}

/** №1 — 8 звёзд, дальше плюс одна звезда за каждый номер. */
export function priceForMethodicalNumber(number: number): number {
  return METHODICAL_PRICE_START + number - 1;
}

/** Цена одной методички: явная наставника, иначе номер, иначе размер файла. */
export function listedPrice(guide: Pick<ShopGuide, "title" | "starPrice" | "fileBytes">): number {
  if (isStarPrice(guide.starPrice)) return guide.starPrice;
  const number = methodicalNumber(guideCode(guide.title));
  if (number) return priceForMethodicalNumber(number);
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
 * В магазине только закрытые методички. Пара 7 и пара 19 — одна карточка
 * по цене своего номера, пока наставник не поставил свою цену хотя бы одной из них.
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
          price: priceForMethodicalNumber(methodicalNumber(pair.codes[0]) ?? 1),
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
