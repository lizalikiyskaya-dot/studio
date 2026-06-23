"use client";

import { useState, useTransition } from "react";
import type { Act } from "@/generated/prisma/client";
import { createAct, updateActField, deleteAct } from "./actions";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";

export default function ActsGrid({ bookId, initialActs }: { bookId: string; initialActs: Act[] }) {
  const [acts, setActs] = useState(initialActs);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const act = await createAct(bookId);
      setActs((prev) => [...prev, act]);
    });
  }

  function handleField(actId: string, field: "title" | "subtitle" | "content", value: string) {
    setActs((prev) => prev.map((a) => (a.id === actId ? { ...a, [field]: value } : a)));
    startTransition(() => updateActField(actId, field, value));
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
      {acts.map((act) => (
        <div key={act.id} className="rounded-md p-4" style={{ border: "1px solid var(--rule)" }}>
          <div className="flex justify-between items-start mb-1">
            <input
              defaultValue={act.title}
              onBlur={(e) => handleField(act.id, "title", e.target.value)}
              className="font-semibold text-[16px] outline-none bg-transparent flex-1"
            />
            <button
              onClick={() => handleDelete(act.id)}
              className="font-mono-label text-[9px]"
              style={{ color: "var(--wine)" }}
            >
              ✕
            </button>
          </div>
          <input
            defaultValue={act.subtitle}
            onBlur={(e) => handleField(act.id, "subtitle", e.target.value)}
            placeholder="завязка / развитие / развязка"
            className="font-mono-label text-[9.5px] outline-none bg-transparent mb-2.5 w-full"
            style={{ color: "var(--faded)" }}
          />
          <AutoGrowTextarea
            defaultValue={act.content}
            onBlur={(v) => handleField(act.id, "content", v)}
            className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed"
          />
        </div>
      ))}

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
