"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Star } from "lucide-react";
import { siteAlert, siteConfirm } from "@/components/SiteDialog";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { starsLabel } from "@/features/stars/rules";
import { buyMethodicals } from "./actions";
import {
  confirmPurchase,
  missingStarsLabel,
  openedLine,
  shopIntro,
  type ShopOffer,
} from "./prices";

const FLY_MS = 900;

function prefersStill(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function ShopView({
  balance: initialBalance,
  earned: initialEarned,
  offers: initialOffers,
  canBuy,
  askOfferId,
  startNotice = "",
}: {
  balance: number;
  earned: number;
  offers: ShopOffer[];
  canBuy: boolean;
  /** Открыть окно подтверждения сразу. Только для просмотра вёрстки. */
  askOfferId?: string;
  startNotice?: string;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [earned, setEarned] = useState(initialEarned);
  const [offers, setOffers] = useState(initialOffers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [notice, setNotice] = useState(startNotice);
  const asked = useRef(false);

  useEffect(() => {
    if (!askOfferId || asked.current) return;
    asked.current = true;
    const offer = initialOffers.find((item) => item.id === askOfferId);
    if (!offer) return;
    void siteConfirm(confirmPurchase(offer.price, initialBalance - offer.price, offer.titles));
  }, [askOfferId, initialBalance, initialOffers]);

  async function buy(offer: ShopOffer) {
    if (!canBuy || busyId || balance < offer.price) return;
    const ok = await siteConfirm(confirmPurchase(offer.price, balance - offer.price, offer.titles));
    if (!ok) return;
    setBusyId(offer.id);
    const result = await buyMethodicals(offer.guideIds);
    setBusyId(null);
    if (!result.ok) {
      await siteAlert(result.error);
      return;
    }
    const still = prefersStill();
    setBalance(result.balance);
    setEarned(result.earned);
    if (!still) {
      setFlying(true);
      setUnlockingId(offer.id);
      await new Promise((resolve) => window.setTimeout(resolve, FLY_MS));
    }
    setFlying(false);
    setUnlockingId(null);
    setOffers((prev) => prev.filter((item) => item.id !== offer.id));
    setNotice(openedLine(offer.titles));
  }

  return (
    <div>
      <PageHeader title="Магазин" description={shopIntro()} />
      <div
        className={`shop-plaque${flying ? " is-spending" : ""}`}
        data-shop-plaque
      >
        <span className="stars-badge grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: "var(--y)", color: "var(--ink)" }} aria-hidden="true">
          <Star size={14} />
          {flying ? (
            <span className="stars-flight-out">
              <Star size={18} fill="var(--y)" strokeWidth={1.75} />
            </span>
          ) : null}
        </span>
        <span className="text-[14.5px] font-semibold">На счету {starsLabel(balance)}</span>
        <span className="text-[13px]" style={{ color: "var(--ink2)" }}>
          Заработано {starsLabel(earned)}
        </span>
      </div>
      {notice ? (
        <p className="shop-note mt-3 text-[15px]" style={{ color: "var(--ink)" }}>
          {notice}
        </p>
      ) : null}
      {offers.length === 0 ? (
        <div className="mt-5">
          <EmptyState cue="Все методички уже открыты" detail="Новая методичка появится здесь сама." />
        </div>
      ) : (
        <div className="shop-grid mt-5">
          {offers.map((offer) => {
            const gap = offer.price - balance;
            const poor = gap > 0;
            const title = offer.titles.join(" и ");
            return (
              <article
                key={offer.id}
                className={`shop-card${unlockingId === offer.id ? " is-unlocking" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="heading min-w-0 text-[18px] font-semibold leading-snug">
                    <Lock size={15} aria-hidden="true" className="shop-lock" />
                    {title}
                  </h2>
                  <span className="shop-price">{offer.price}</span>
                </div>
                {offer.description ? <p className="shop-blurb">{offer.description}</p> : null}
                {canBuy ? (
                  <button
                    type="button"
                    className="shop-buy"
                    disabled={poor || busyId !== null}
                    onClick={() => void buy(offer)}
                  >
                    {poor ? missingStarsLabel(gap) : "Открыть"}
                  </button>
                ) : (
                  <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
                    Покупку делает ученик.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
