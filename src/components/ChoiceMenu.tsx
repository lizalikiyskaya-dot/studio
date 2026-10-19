"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { useSheetSwipe } from "@/components/useSheetSwipe";

export type Choice<T extends string> = {
  id: T;
  label: string;
  style: React.CSSProperties;
};

export default function ChoiceMenu<T extends string>({
  value,
  choices,
  menuLabel,
  onChange,
}: {
  value: T;
  choices: Choice<T>[];
  menuLabel: string;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const current = choices.find((item) => item.id === value) ?? choices[0];

  useSheetSwipe(open && mobile, () => setOpen(false), panelRef, bodyRef);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 980px)");
    const apply = () => setMobile(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open || mobile) return;
    function place() {
      const el = buttonRef.current;
      if (!el) return;
      const width = 248;
      const height = choices.length * 48 + 20;
      const rect = el.getBoundingClientRect();
      const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
      const below = rect.bottom + 6;
      const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
      setBox({ top, left });
    }
    place();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, mobile, choices.length]);

  useEffect(() => {
    if (!open || !mobile) return;
    document.documentElement.classList.add("studio-sheet-open");
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("studio-sheet-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [open, mobile]);

  function pick(next: T) {
    setOpen(false);
    if (next !== value) onChange(next);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Статус: ${current?.label ?? ""}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((item) => !item);
        }}
        className="text-[13px] px-3 py-1.5 rounded-full font-medium whitespace-nowrap"
        style={current?.style}
      >
        {current?.label}
      </button>
      {open && mobile
        ? createPortal(
            <div className="studio-sheet-root" style={{ bottom: 78 }}>
              <button type="button" className="studio-sheet-backdrop" aria-label="Закрыть" onClick={() => setOpen(false)} />
              <div ref={panelRef} className="studio-sheet" role="dialog" aria-label={menuLabel}>
                <div className="studio-sheet-head">
                  <button type="button" className="sheet-grab" data-sheet-handle aria-label="Потянуть, чтобы закрыть">
                    <span />
                  </button>
                  <div className="text-[16px] font-semibold">Статус</div>
                  <button type="button" className="studio-sheet-close" onClick={() => setOpen(false)}>
                    <X size={16} /> Закрыть
                  </button>
                </div>
                <div ref={bodyRef} className="studio-sheet-body">
                  <Choices value={value} choices={choices} menuLabel={menuLabel} onPick={pick} />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {open && !mobile && box
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-50 p-1.5"
              style={{
                top: box.top,
                left: box.left,
                width: 248,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 16,
                boxShadow: "0 18px 40px -24px rgba(43, 45, 92, 0.45)",
              }}
            >
              <Choices value={value} choices={choices} menuLabel={menuLabel} onPick={pick} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Choices<T extends string>({
  value,
  choices,
  menuLabel,
  onPick,
}: {
  value: T;
  choices: Choice<T>[];
  menuLabel: string;
  onPick: (value: T) => void;
}) {
  return (
    <div role="menu" aria-label={menuLabel} className="flex flex-col gap-1">
      {choices.map((item) => {
        const current = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitemradio"
            aria-checked={current}
            onClick={() => onPick(item.id)}
            className="flex items-center justify-between gap-3 min-h-11 px-2 rounded-[14px] text-left"
            style={{ background: current ? "var(--soft)" : "transparent" }}
          >
            <span className="text-[13px] px-2.5 py-1 rounded-full font-medium" style={item.style}>
              {item.label}
            </span>
            {current ? <Check size={16} aria-hidden="true" style={{ color: "var(--ink)" }} /> : <span className="w-4" />}
          </button>
        );
      })}
    </div>
  );
}
