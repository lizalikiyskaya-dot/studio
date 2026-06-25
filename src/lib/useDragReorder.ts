"use client";

import { useState } from "react";
import { reorderArray } from "./reorder";

export type DragHandlers = {
  draggable: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
};

export function useDragReorder<T extends { id: string }>(
  items: T[],
  setItems: (items: T[]) => void,
  persist: (orderedIds: string[]) => void
) {
  const [dragId, setDragId] = useState<string | null>(null);

  return function dragHandlers(id: string): DragHandlers {
    return {
      draggable: true,
      onDragStart: () => setDragId(id),
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
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
  };
}
