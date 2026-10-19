"use client";

import { useId, useState } from "react";

export default function WeekCallNote({
  note,
  untilLabel,
}: {
  note: string;
  untilLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const noteId = useId();
  const text = note.trim();

  return (
    <div className="banner-call-body">
      <p id={noteId} className={expanded ? "banner-call-note" : "banner-call-note is-clamped"}>
        {text}
      </p>
      <button
        type="button"
        className="banner-call-toggle"
        aria-expanded={expanded}
        aria-controls={noteId}
        onClick={() => setExpanded((open) => !open)}
      >
        {expanded ? "Свернуть" : "Развернуть"}
      </button>
      {untilLabel ? <p className="banner-call-until">{untilLabel}</p> : null}
    </div>
  );
}
