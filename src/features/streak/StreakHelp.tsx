"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";
import { STREAK_HINT } from "./weeks";

export default function StreakHelp() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--ink)" }}
        aria-label="Когда неделя идёт в серию"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <CircleHelp size={16} aria-hidden="true" />
      </button>
      {open
        ? createPortal(
            <div className="site-dialog-root">
              <button type="button" className="site-dialog-backdrop" aria-label="Закрыть" onClick={() => setOpen(false)} />
              <div
                className="site-dialog-card stars-help-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
              >
                <div className="site-dialog-title" id={titleId}>
                  Когда неделя идёт в серию
                </div>
                <p className="mt-2 text-[14px] font-normal leading-snug" style={{ color: "var(--ink2)" }}>
                  {STREAK_HINT}
                </p>
                <div className="site-dialog-actions">
                  <button type="button" className="site-dialog-primary" autoFocus onClick={() => setOpen(false)}>
                    Понятно
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
