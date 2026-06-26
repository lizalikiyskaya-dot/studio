"use client";

import { useState } from "react";
import { Check } from "lucide-react";

/**
 * Explicit "Сохранить" affordance for cards whose fields save on blur.
 * Blur already persists the value, but clicking elsewhere to collapse a
 * card doesn't give visible confirmation that it happened — this forces
 * any focused field inside the card to blur (flushing its save) and
 * shows a brief confirmation, so the save isn't just a silent assumption.
 */
export default function CardSaveButton({ scopeRef }: { scopeRef: React.RefObject<HTMLElement | null> }) {
  const [justSaved, setJustSaved] = useState(false);

  function handleSave() {
    const active = document.activeElement as HTMLElement | null;
    if (active && scopeRef.current?.contains(active)) active.blur();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }

  return (
    <button
      onClick={handleSave}
      className="flex items-center gap-1.5 text-[12.5px] px-2.5 py-1.5 rounded-sm flex-shrink-0"
      style={{
        color: justSaved ? "#fff" : "var(--sage)",
        background: justSaved ? "var(--sage)" : "transparent",
        border: "1px solid var(--sage)",
      }}
    >
      {justSaved && <Check size={13} />}
      {justSaved ? "сохранено" : "Сохранить"}
    </button>
  );
}
