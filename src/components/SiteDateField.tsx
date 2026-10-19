"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useSheetSwipe } from "@/components/useSheetSwipe";

function parseStored(value: string): Date | null {
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  return null;
}

function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < pad; i += 1) cells.push(null);
  for (let day = 1; day <= count; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export default function SiteDateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseStored(value);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [cursor, setCursor] = useState(() => parsed ?? new Date());
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useSheetSwipe(open && mobile, () => setOpen(false), panelRef, bodyRef);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 980px)");
    const apply = () => setMobile(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  function toggle() {
    setCursor(parseStored(value) ?? new Date());
    setOpen((item) => !item);
  }

  useEffect(() => {
    if (!open || mobile) return;
    function place() {
      const el = buttonRef.current;
      if (!el) return;
      const width = 312;
      const height = 360;
      const rect = el.getBoundingClientRect();
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const below = rect.bottom + 8;
      const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 8) : below;
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
  }, [open, mobile]);

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

  function choose(date: Date) {
    onChange(toIso(date));
    setOpen(false);
  }

  const monthName = cursor.toLocaleDateString("ru-RU", { month: "long" });
  const cells = monthCells(cursor.getFullYear(), cursor.getMonth());
  const today = new Date();

  const label = parsed
    ? parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : value.trim() || "Выбрать дату";

  const calendar = (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button type="button" className="site-date-nav" aria-label="Предыдущий месяц" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold">
          {monthName} {cursor.getFullYear()}
        </div>
        <button type="button" className="site-date-nav" aria-label="Следующий месяц" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[12px]" style={{ color: "var(--muted)" }}>
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) =>
          date ? (
            <button
              key={date.toISOString()}
              type="button"
              className="site-date-day"
              aria-pressed={parsed ? sameDay(date, parsed) : false}
              onClick={() => choose(date)}
              style={
                parsed && sameDay(date, parsed)
                  ? { background: "var(--y)", color: "var(--ink)", fontWeight: 650 }
                  : sameDay(date, today)
                    ? { boxShadow: "inset 0 0 0 1px var(--border)" }
                    : undefined
              }
            >
              {date.getDate()}
            </button>
          ) : (
            <span key={`empty-${index}`} />
          ),
        )}
      </div>
      {value.trim() ? (
        <button
          type="button"
          className="mt-3 text-[13px]"
          style={{ color: "var(--vi)" }}
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          Очистить
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="entry-date"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Дата: ${label}`}
        onClick={toggle}
      >
        {parsed ? (
          <span className="entry-date-main">
            {parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            <span className="entry-date-year">{parsed.getFullYear()}</span>
          </span>
        ) : (
          <span className={value.trim() ? "entry-date-main" : "entry-date-empty"}>{value.trim() || "Выбрать дату"}</span>
        )}
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      {open && mobile
        ? createPortal(
            <div className="studio-sheet-root" style={{ bottom: 78 }}>
              <button type="button" className="studio-sheet-backdrop" aria-label="Закрыть" onClick={() => setOpen(false)} />
              <div ref={panelRef} className="studio-sheet" role="dialog" aria-label="Дата">
                <div className="studio-sheet-head">
                  <button type="button" className="sheet-grab" data-sheet-handle aria-label="Потянуть, чтобы закрыть">
                    <span />
                  </button>
                  <div className="text-[16px] font-semibold">Дата</div>
                  <button type="button" className="studio-sheet-close" onClick={() => setOpen(false)}>
                    <X size={16} /> Закрыть
                  </button>
                </div>
                <div ref={bodyRef} className="studio-sheet-body">
                  {calendar}
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
              className="fixed z-50 p-4"
              role="dialog"
              aria-label="Дата"
              style={{
                top: box.top,
                left: box.left,
                width: 312,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 16,
                boxShadow: "0 18px 40px -24px rgba(43, 45, 92, 0.45)",
              }}
            >
              {calendar}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
