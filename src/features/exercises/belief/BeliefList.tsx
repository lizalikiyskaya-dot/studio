"use client";

import { useState, useTransition } from "react";
import type { BeliefCard } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { createBeliefCard, updateBeliefField, deleteBeliefCard } from "./actions";

export default function BeliefList({
  studentId,
  initialCards,
}: {
  studentId: string;
  initialCards: BeliefCard[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const card = await createBeliefCard(studentId);
      setCards((prev) => [...prev, card]);
    });
  }

  function handleField(id: string, field: "hero" | "startBelief" | "endBelief", value: string) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    startTransition(() => updateBeliefField(id, field, value));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить карточку?")) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteBeliefCard(id));
  }

  return (
    <div>
      {cards.map((card) => (
        <div key={card.id} className="rounded-md p-4 mb-4 max-w-[680px]" style={{ border: "1px solid var(--rule)" }}>
          <div className="flex items-center gap-3 mb-3">
            <label className="font-mono-label text-[9px] uppercase tracking-wide" style={{ color: "var(--faded)" }}>
              Герой
            </label>
            <input
              defaultValue={card.hero}
              onBlur={(e) => handleField(card.id, "hero", e.target.value)}
              className="flex-1 outline-none bg-transparent text-[15px] font-semibold border-b pb-1"
              style={{ borderColor: "var(--rule)" }}
            />
            <button
              onClick={() => handleDelete(card.id)}
              className="font-mono-label text-[10px] px-2 py-1 rounded-sm flex-shrink-0"
              style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
            >
              Удалить
            </button>
          </div>
          <div className="mb-3">
            <label className="block font-mono-label text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--faded)" }}>
              В начале истории герой думает, что...
            </label>
            <AutoGrowTextarea
              defaultValue={card.startBelief}
              onBlur={(v) => handleField(card.id, "startBelief", v)}
              className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
              style={{ borderColor: "var(--rule)" }}
            />
          </div>
          <div>
            <label className="block font-mono-label text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--faded)" }}>
              В конце истории понимает, что...
            </label>
            <AutoGrowTextarea
              defaultValue={card.endBelief}
              onBlur={(v) => handleField(card.id, "endBelief", v)}
              className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
              style={{ borderColor: "var(--rule)" }}
            />
          </div>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + добавить героя
      </button>
    </div>
  );
}
