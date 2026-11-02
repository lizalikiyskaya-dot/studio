"use client";

import { useState } from "react";
import ManuscriptFocus from "@/features/drafts/ManuscriptFocus";
import { weeklyFormat, weeklyPlain } from "./weeklyText";

export function WeeklyEditor({
  viewerId,
  value,
  onChange,
}: {
  viewerId: string;
  value: string;
  onChange: (text: string) => void;
}) {
  const [screen, setScreen] = useState(false);
  return (
    <ManuscriptFocus
      title="Задание недели"
      value={value}
      format={weeklyFormat(value)}
      onChange={(content) => onChange(content)}
      placeholder="Напишите здесь. Задание необязательное."
      viewerId={viewerId}
      layout={screen ? "screen" : "page"}
      onClose={() => setScreen((open) => !open)}
    />
  );
}

export function WeeklyPreview({
  viewerId,
  title,
  text,
}: {
  viewerId: string;
  title: string;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="weekly-preview">
      <p>{weeklyPlain(text)}</p>
      <button type="button" className="weekly-expand" onClick={() => setOpen(true)}>Развернуть</button>
      {open ? (
        <ManuscriptFocus
          title={title}
          value={text}
          format={weeklyFormat(text)}
          onChange={() => {}}
          placeholder=""
          readOnly
          viewerId={viewerId}
          layout="screen"
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
