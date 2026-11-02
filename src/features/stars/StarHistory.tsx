"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { StarHistoryEntry } from "./award";
import { groupStarHistory, starHistoryDelta } from "./history";

/** История звёзд закрыта, пока её не откроют. Одна и та же в кабинете ученика и у наставника. */
export default function StarHistory({ rows }: { rows: StarHistoryEntry[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const groups = groupStarHistory(rows);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="star-history" ref={rootRef}>
      <button
        type="button"
        className="star-history-button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        История звёзд
      </button>
      {open ? (
        <div id={panelId} className="star-history-panel" role="region" aria-label="История звёзд">
          {rows.length === 0 ? (
            <p className="text-[13.5px] leading-snug" style={{ color: "var(--muted)" }}>
              Пока пусто. Звёздочки появятся, когда Вы сдадите задание, главу или задание недели.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.date}>
                <h3 className="star-history-date">{group.date}</h3>
                <ul>
                  {group.rows.map((row) => {
                    const delta = starHistoryDelta(row.points);
                    const sign = row.points < 0 ? "is-minus" : "is-plus";
                    return (
                      <li key={row.id} className="star-history-row">
                        <span className="min-w-0">{row.reason}</span>
                        <span className={`star-history-delta ${sign}`}>{delta}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
