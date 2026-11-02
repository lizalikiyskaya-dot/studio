"use client";

import { GripVertical } from "lucide-react";

export default function ChapterMove({
  first,
  last,
  onUp,
  onDown,
  onDragStart,
}: {
  first: boolean;
  last: boolean;
  onUp: () => void;
  onDown: () => void;
  onDragStart: () => void;
}) {
  return (
    <span className="chapter-move">
      <button
        type="button"
        className="chapter-tool chapter-tool-icon"
        draggable
        aria-label="Порядок главы"
        title="Перетащите или нажмите стрелки"
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", "chapter");
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          if (event.key === "ArrowUp") onUp();
          else onDown();
        }}
      >
        <GripVertical size={14} />
      </button>
      <button type="button" className="chapter-tool" aria-label="Выше" disabled={first} onClick={onUp}>
        ↑
      </button>
      <button type="button" className="chapter-tool" aria-label="Ниже" disabled={last} onClick={onDown}>
        ↓
      </button>
    </span>
  );
}
