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

export type SettingMixActions = {
  save: (shares: SettingShares) => Promise<{ suggested: boolean }>;
  accept: () => Promise<void>;
  reject: () => Promise<void>;
};

export default function SettingMixPanel({
  bookId,
  initial,
  suggestion,
  children,
  actions,
  readOnly = false,
}: {
  bookId?: string;
  initial: SettingShares;
  suggestion?: string | null;
  children?: React.ReactNode;
  actions?: SettingMixActions;
  readOnly?: boolean;
}) {
  const [shares, setShares] = useState<SettingShares>(initial);
  const sharesRef = useRef(shares);
  const savedRef = useRef(initial);
  const [pending, setPending] = useState<string | null>(suggestion ?? null);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const view = describeShares(shares);
  const proposed = pending ? parseShares(pending) : null;
  const proposedView = proposed ? describeShares(proposed) : null;

  function commit(next: SettingShares = sharesRef.current) {
    if (readOnly || (!actions && !bookId)) return;
    sharesRef.current = next;
    setShares(next);
    startTransition(async () => {
      const result = actions ? await actions.save(next) : await saveSettingMix(bookId!, next);
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

  const rows = view.rows.filter((row) => row.value > 0).sort((a, b) => b.value - a.value);

  return (
    <section className="rounded-[24px] p-3.5" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold">Тип сеттинга</h2>
        {!readOnly && !proposed ? (
          <button
            type="button"
            className="ml-auto rounded-full px-3 text-[12.5px]"
            style={{ height: 28, border: "1px solid var(--border)", background: open ? "#202020" : "#fff", color: open ? "#fff" : "var(--ink)" }}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "свернуть" : "настроить"}
          </button>
        ) : null}
      </div>

      {proposed && proposedView ? (
        <div className="mt-3 rounded-[16px] p-3" style={{ border: "1px solid var(--border)" }}>
          <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>Вывод</div>
          <div className="mt-1 text-[14px] leading-snug">
            <span style={{ textDecoration: "line-through", color: "var(--faded)" }}>{shareLine(view)}</span>
          </div>
          <div className="mt-1 text-[14px] leading-snug" style={{ color: "var(--link)", textDecoration: "underline wavy" }}>{shareLine(proposedView)}</div>
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
                startTransition(() => (actions ? actions.accept() : acceptSettingMix(bookId!)));
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
                startTransition(() => (actions ? actions.reject() : rejectSettingMix(bookId!)));
              }}
            >
              <X size={12} /> отклонить
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>Итог</div>
          <div className="mt-0.5 text-[13.5px] font-semibold leading-snug">{view.title}</div>
          {rows.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1.5">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2 text-[12px]">
                  <span className="w-[76px] shrink-0">{row.label}</span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "#E8E1DC" }}>
                    <span className="block h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                  </span>
                  <span className="w-8 shrink-0 text-right tabular-nums">{row.pct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[12.5px]" style={{ color: "var(--muted)" }}>Ползунки ещё на нуле.</p>
          )}
        </div>
      )}

      {open && !proposed ? (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <div className="setting-quadrant">
              {QUADRANT.map((id) => {
                const meta = MIX_META[id];
                const amount = shares[id] / 100;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pick(id)}
                    disabled={readOnly}
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
          <div className="rounded-[16px] px-3 py-3" style={{ border: "1px solid var(--border)", background: "#fff" }}>
            <div className="flex flex-col gap-2.5">
              {SLIDERS.map((id) => {
                const meta = MIX_META[id];
                return (
                  <label key={id} className="grid items-center gap-2 text-[12.5px]" style={{ gridTemplateColumns: "76px minmax(0, 1fr) 28px" }}>
                    <span className="whitespace-nowrap">{meta.label}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={shares[id]}
                      disabled={readOnly}
                      onChange={(e) => setOne(id, Number(e.target.value))}
                      onPointerUp={() => commit()}
                      onKeyUp={() => commit()}
                      onBlur={() => commit()}
                      aria-label={meta.label}
                      className="share-range"
                    />
                    <span className="tabular-nums text-right">{shares[id]}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-[12.5px] leading-snug" style={{ color: "var(--ink2)" }}>
              Слева 0 — этой грани нет, справа 100 — она на полную.
            </p>
            <p className="mt-1 text-[12.5px] leading-snug" style={{ color: "var(--ink2)" }}>
              Манифест — мир иллюстрирует идею. Фильтр — настроение, без объяснений. Конфликт — правила и испытания. Магнит — понятный мир, куда хочется вернуться.
            </p>
          </div>
          {children}
        </div>
      ) : null}
    </section>
  );
}
