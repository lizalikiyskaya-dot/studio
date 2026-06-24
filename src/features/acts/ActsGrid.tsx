"use client";

import { useState, useTransition } from "react";
import type { Act } from "@/generated/prisma/client";
import { createAct, deleteAct } from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";

export default function ActsGrid({
  bookId,
  initialActs,
  suggestions,
}: {
  bookId: string;
  initialActs: Act[];
  suggestions: Record<string, Record<string, string>>;
}) {
  const [acts, setActs] = useState(initialActs);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const act = await createAct(bookId);
      setActs((prev) => [...prev, act]);
    });
  }

  function handleDelete(actId: string) {
    if (!window.confirm("Удалить акт?")) return;
    startTransition(async () => {
      await deleteAct(actId);
      setActs((prev) => prev.filter((a) => a.id !== actId));
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      {acts.map((act) => {
        const actSuggestions = suggestions[act.id] ?? {};
        return (
          <div key={act.id} className="rounded-md p-4" style={{ border: "1px solid var(--rule)" }}>
            <div className="flex justify-between items-start mb-1">
              <SuggestableField
                model="Act"
                recordId={act.id}
                field="title"
                value={act.title}
                suggestion={actSuggestions.title}
                as="input"
                className="heading font-semibold text-[16px] outline-none bg-transparent flex-1"
              />
              <button
                onClick={() => handleDelete(act.id)}
                className="font-mono-label text-[9px]"
                style={{ color: "var(--wine)" }}
              >
                ✕
              </button>
            </div>
            <SuggestableField
              model="Act"
              recordId={act.id}
              field="subtitle"
              value={act.subtitle}
              suggestion={actSuggestions.subtitle}
              as="input"
              placeholder="завязка / развитие / развязка"
              className="font-mono-label text-[9.5px] outline-none bg-transparent mb-2.5 w-full"
              style={{ color: "var(--faded)" }}
            />
            <SuggestableField
              model="Act"
              recordId={act.id}
              field="content"
              value={act.content}
              suggestion={actSuggestions.content}
              className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed"
            />
          </div>
        );
      })}

      <button
        onClick={handleAdd}
        className="rounded-md flex items-center justify-center font-mono-label text-[12px] min-h-[140px]"
        style={{ border: "1px dashed var(--rule)", color: "var(--faded)" }}
      >
        + добавить акт
      </button>
    </div>
  );
}
