"use client";

import { STAR_PRICE_OPTIONS, type StarPrice } from "./prices";

export default function GuidePriceField({
  price,
  onPick,
  disabled,
}: {
  price: number;
  onPick: (price: StarPrice) => void;
  disabled?: boolean;
}) {
  return (
    <div className="guide-price" role="group" aria-label="Цена в магазине">
      <span className="text-[13px]" style={{ color: "var(--ink2)" }}>
        Цена в магазине · {price}
      </span>
      {STAR_PRICE_OPTIONS.map((item) => {
        const on = item === price;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onPick(item)}
            className="rounded-full px-3 h-8 text-[13.5px] font-semibold"
            style={{
              background: on ? "var(--y)" : "#fff",
              color: "var(--ink)",
              border: on ? "1.5px solid var(--y)" : "1.5px solid var(--border)",
            }}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
