"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { createCycle } from "./actions";
import { createStandaloneStory } from "@/features/stories/actions";
import EmptyState from "@/components/EmptyState";

export default function NoCycleYet({ studentId }: { studentId: string }) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const cycle = await createCycle(studentId);
      window.location.href = `?cycle=${cycle.id}`;
    });
  }

  function handleStory() {
    startTransition(async () => {
      const story = await createStandaloneStory(studentId);
      const storiesPath = pathname.replace(/\/cycles$/, "/stories");
      window.location.href = `${storiesPath}?story=${story.id}`;
    });
  }

  return (
    <EmptyState
      cue="Самое время собрать цикл"
      detail="Цикл объединяет рассказы, персонажей и сеттинг. Отдельный рассказ можно начать и без цикла."
      action={
        <span className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={handleCreate} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Новый цикл
          </button>
          <button type="button" onClick={handleStory} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto", background: "var(--soft)", fontWeight: 500 }}>
            <Plus size={16} /> Новый рассказ
          </button>
        </span>
      }
    />
  );
}
