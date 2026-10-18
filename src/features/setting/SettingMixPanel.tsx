"use client";

import { useRef, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import {
  MIX_META,
  clampShare,
  describeShares,
  emptyShares,
  parseShares,
  type SettingShares,
} from "./settingMix";
import { acceptSettingMix, rejectSettingMix, saveSettingMix } from "./actions";

const QUADRANT = ["conflict", "manifest", "magnet", "filter"] as const;
const SLIDERS = ["manifest", "filter", "conflict", "magnet"] as const;

function shareLine(view: { title: string; rows: { label: string; value: number; pct: number }[] }) {
  const parts = view.rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
  const shares = parts.map((row) => `${row.label} ${row.pct}%`).join(" · ");
  return shares ? `${view.title} — ${shares}` : view.title;
}

export default function SettingMixPanel({
  bookId,
  initial,
  suggestion,
  children,
}: {
  bookId: string;
  initial: SettingShares;
  suggestion?: string | null;
  children?: React.ReactNode;
}) {
  const [shares, setShares] = useState<SettingShares>(initial);
  const sharesRef = useRef(shares);
  const savedRef = useRef(initial);
  const [pending, setPending] = useState<string | null>(suggestion ?? null);
  const [, startTransition] = useTransition();
  const view = describeShares(shares);
  const proposed = pending ? parseShares(pending) : null;
  const proposedView = proposed ? describeShares(proposed) : null;

  function commit(next: SettingShares = sharesRef.current) {
    sharesRef.current = next;
    setShares(next);
    startTransition(async () => {
      const result = await saveSettingMix(bookId, next);
      if (result.suggested) {
        sharesRef.current = savedRef.current;
        setShares(savedRef.current);
        setPending(JSON.stringify(next));
      } else {
        savedRef.current = next;
        setPending(null);
      }
    });
  }

  function setOne(id: keyof SettingShares, value: number) {
    const next = { ...sharesRef.current, [id]: clampShare(value) };
    sharesRef.current = next;
    setShares(next);
  }

  function pick(id: keyof SettingShares) {
    const next = emptyShares();
    next[id] = 100;
    commit(next);
  }

  if (proposed && proposedView) {
    return (
      <div>
        <div className="rounded-[16px] p-3" style={{ border: "1px solid var(--border)" }}>
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>Вывод</div>
          <div className="mt-1 text-[15px] leading-snug">
            <span style={{ textDecoration: "line-through", color: "var(--faded)" }}>{shareLine(view)}</span>
          </div>
          <div className="mt-1 text-[15px] leading-snug" style={{ color: "var(--wine)", textDecoration: "underline wavy" }}>{shareLine(proposedView)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-y inline-flex items-center gap-1 px-3.5 text-[12.5px]"
              style={{ height: 32, width: "auto" }}
              onClick={() => {
                savedRef.current = proposed;
                sharesRef.current = proposed;
                setShares(proposed);
                setPending(null);
                startTransition(() => acceptSettingMix(bookId));
              }}
            >
              <Check size={12} /> принять правку
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-3.5 text-[12px]"
              style={{ height: 32, color: "var(--faded)", border: "1px solid var(--rule)" }}
              onClick={() => {
                sharesRef.current = savedRef.current;
                setShares(savedRef.current);
                setPending(null);
                startTransition(() => rejectSettingMix(bookId));
              }}
            >
              <X size={12} /> отклонить
            </button>
          </div>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="shrink-0">
        <div className="relative grid grid-cols-2 overflow-hidden rounded-[16px]" style={{ width: 260, height: 210, background: "#FAFAFA", border: "1px solid var(--border)" }}>
          {QUADRANT.map((id) => {
            const meta = MIX_META[id];
            const amount = shares[id] / 100;
            return (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                className="relative text-left"
                style={{ background: `color-mix(in srgb, ${meta.bg} ${Math.round(12 + amount * 88)}%, white)` }}
                title={`Выбрать «${meta.label}»`}
              >
                <span className="absolute text-[12px] font-semibold" style={{ color: meta.color, top: id === "magnet" || id === "filter" ? "auto" : 8, bottom: id === "magnet" || id === "filter" ? 8 : "auto", left: id === "manifest" || id === "filter" ? "auto" : 8, right: id === "manifest" || id === "filter" ? 8 : "auto" }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
          <span className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[10px]" style={{ color: "var(--muted)" }}>дискомфорт</span>
          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px]" style={{ color: "var(--muted)" }}>комфорт</span>
          <span className="pointer-events-none absolute left-1/2 top-3 bottom-3 w-px" style={{ background: "repeating-linear-gradient(to bottom, #C8C8C8 0 3px, transparent 3px 6px)" }} />
          <span className="pointer-events-none absolute top-1/2 left-3 right-3 h-px" style={{ background: "repeating-linear-gradient(to right, #C8C8C8 0 3px, transparent 3px 6px)" }} />
        </div>
        <div className="mt-1 flex justify-between px-1 text-[10.5px]" style={{ color: "var(--muted)" }}>
          <span>логика · hard</span>
          <span>интуиция · soft</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>Вывод</div>
        <div className="mt-0.5 text-[16px] font-semibold leading-snug">{view.title}</div>
        <div className="mt-3 flex flex-col gap-2">
          {SLIDERS.map((id) => {
            const meta = MIX_META[id];
            return (
              <label key={id} className="grid items-center gap-2 text-[12.5px]" style={{ gridTemplateColumns: "92px 1fr 36px" }}>
                <span className="whitespace-nowrap">{meta.label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={shares[id]}
                  onChange={(e) => setOne(id, Number(e.target.value))}
                  onPointerUp={() => commit()}
                  onKeyUp={() => commit()}
                  onBlur={() => commit()}
                  aria-label={meta.label}
                  style={{ accentColor: meta.color }}
                />
                <span className="tabular-nums text-right">{shares[id]}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-3 space-y-1.5">
          {view.rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value).map((row) => (
            <div key={row.id} className="flex items-center gap-2 text-[12.5px]">
              <span className="w-[92px]">{row.label}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                <span className="block h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
              </span>
              <span className="w-8 text-right tabular-nums">{row.pct}%</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] leading-snug" style={{ color: "var(--ink2)" }}>{view.meaning}</p>
        {children}
      </div>
    </div>
  );
}
