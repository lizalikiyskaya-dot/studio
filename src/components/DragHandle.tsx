"use client";

import type { DragHandleHandlers } from "@/lib/useDragReorder";

export default function DragHandle({ handlers }: { handlers: DragHandleHandlers }) {
  return (
    <span
      {...handlers}
      className="cursor-grab select-none flex-shrink-0"
      style={{ color: "var(--faded)", fontSize: 14, lineHeight: 1, padding: "4px 2px" }}
      title="Перетащить, чтобы изменить порядок"
    >
      ⠿
    </span>
  );
}
