"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import Mark from "@/components/Mark";
import { useSheetSwipe } from "@/components/useSheetSwipe";
import type { TaskStatus } from "@/generated/prisma/client";
import { TASK_STATUSES, TASK_STATUS_LABEL } from "./status";

const STATUS_STYLE: Record<TaskStatus, React.CSSProperties> = {
  PLANNED: { background: "var(--soft)", color: "var(--ink2)" },
  IN_PROGRESS: { background: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)" },
  SUBMITTED: { background: "var(--pill-vio-bg)", color: "var(--pill-vio-fg)" },
  NEEDS_REVISION: { background: "var(--pill-or-bg)", color: "var(--pill-or-fg)" },
  ACCEPTED: { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" },
};

function StatusChoices({
  status,
  onPick,
}: {
  status: TaskStatus;
  onPick: (status: TaskStatus) => void;
}) {
  return (
    <div role="menu" aria-label="Статус задания" className="flex flex-col gap-1">
      {TASK_STATUSES.map((item) => {
        const current = item === status;
        return (
          <button
            key={item}
            type="button"
            role="menuitemradio"
            aria-checked={current}
            onClick={() => onPick(item)}
            className="flex items-center justify-between gap-3 min-h-11 px-2 rounded-[14px] text-left"
            style={{ background: current ? "var(--soft)" : "transparent" }}
          >
            <span className="text-[13px] px-2.5 py-1 rounded-full font-medium" style={STATUS_STYLE[item]}>
              {TASK_STATUS_LABEL[item]}
            </span>
            {current ? <Check size={16} aria-hidden="true" style={{ color: "var(--ink)" }} /> : <span className="w-4" />}
          </button>
        );
      })}
    </div>
  );
}

export default function TaskStatusMenu({
  status,
  onChange,
}: {
  status: TaskStatus;
  onChange: (status: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
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

  useEffect(() => {
    if (!open || mobile) return;
    function place() {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 248;
      const height = 292;
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

  function pick(next: TaskStatus) {
    setOpen(false);
    if (next !== status) onChange(next);
  }

  const chipClass =
    status === "ACCEPTED"
      ? "text-[14px] font-medium whitespace-nowrap"
      : "text-[12px] px-2.5 py-1.5 rounded-full whitespace-nowrap";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Статус: ${TASK_STATUS_LABEL[status]}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={chipClass}
        style={status === "ACCEPTED" ? undefined : STATUS_STYLE[status]}
      >
        {status === "ACCEPTED" ? <Mark>Принято</Mark> : TASK_STATUS_LABEL[status]}
      </button>
      {open && mobile
        ? createPortal(
            <div className="studio-sheet-root" style={{ bottom: 78 }}>
              <button type="button" className="studio-sheet-backdrop" aria-label="Закрыть" onClick={() => setOpen(false)} />
              <div ref={panelRef} className="studio-sheet" role="dialog" aria-label="Статус задания">
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
                  <StatusChoices status={status} onPick={pick} />
                </div>
              </div>
            </div>,
            document.body
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
              <StatusChoices status={status} onPick={pick} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}
