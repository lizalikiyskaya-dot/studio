"use client";

import { useState } from "react";
import { reorderArray } from "./reorder";

export type DropTargetHandlers = {
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
};

export type DragHandleHandlers = {
  draggable: boolean;
  onDragStart: () => void;
};

/**
 * draggable=true on a whole card breaks text selection and clicks on
 * inner inputs (the browser treats the gesture as a potential drag).
 * Keep `draggable` on a small dedicated handle only, and put
 * onDragOver/onDrop on the card itself so dropping anywhere on it works.
 */
export function useDragReorder<T extends { id: string }>(
  items: T[],
  setItems: (items: T[]) => void,
  persist: (orderedIds: string[]) => void
) {
  const [dragId, setDragId] = useState<string | null>(null);

  function dropTarget(id: string): DropTargetHandlers {
    return {
      onDragOver: (e) => e.preventDefault(),
      onDrop: (e) => {
        e.preventDefault();
        if (!dragId || dragId === id) return;
        const fromIndex = items.findIndex((i) => i.id === dragId);
        const toIndex = items.findIndex((i) => i.id === id);
        if (fromIndex === -1 || toIndex === -1) return;
        const next = reorderArray(items, fromIndex, toIndex);
        setItems(next);
        persist(next.map((i) => i.id));
        setDragId(null);
      },
    };
  }

  function dragHandle(id: string): DragHandleHandlers {
    return {
      draggable: true,
      onDragStart: () => setDragId(id),
    };
  }

  return { dropTarget, dragHandle };
}
