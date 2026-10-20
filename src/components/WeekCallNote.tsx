"use client";

import { useId, useState, type ReactNode } from "react";

export default function WeekCallNote({
  title,
  deadline,
  note,
  untilLabel,
  actions,
}: {
  title: string;
  deadline: string;
  note: string;
  untilLabel: string;
  actions?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const text = note.trim();

  return (
    <div className="banner-call">
      <span className="deadline-ribbon" aria-hidden="true" />
      <button
        type="button"
        className="banner-call-line"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className="banner-call-label">Опен-колл недели</span>
        <span className="banner-call-title">
          {title} — приём до {deadline}
        </span>
      </button>
      {expanded ? (
        <div id={detailsId} className="banner-call-body">
          {text ? <p className="banner-call-note">{text}</p> : null}
          {untilLabel ? <p className="banner-call-until">{untilLabel}</p> : null}
          {actions ? <div className="banner-call-actions">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
