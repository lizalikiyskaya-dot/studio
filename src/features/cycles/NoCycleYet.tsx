"use client";

import { useTransition } from "react";
import { Plus } from "lucide-react";
import { createCycle } from "./actions";
import EmptyState from "@/components/EmptyState";

export default function NoCycleYet({ studentId }: { studentId: string }) {
  const [, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const cycle = await createCycle(studentId);
      window.location.href = `?cycle=${cycle.id}`;
    });
  }

  return (
    <EmptyState
      cue="Самое время собрать цикл"
      detail="Цикл объединяет рассказы, персонажей и сеттинг."
      action={
        <button type="button" onClick={handleCreate} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
          <Plus size={16} /> Новый цикл
        </button>
      }
    />
  );
}
