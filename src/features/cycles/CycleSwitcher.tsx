"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Plus } from "lucide-react";
import { createCycle, deleteCycle } from "./actions";
import { createStandaloneStory } from "@/features/stories/actions";

export default function CycleSwitcher({
  studentId,
  cycles,
  activeCycleId,
  inline = false,
}: {
  studentId: string;
  cycles: { id: string; title: string }[];
  activeCycleId: string;
  inline?: boolean;
}) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function handleChange(cycleId: string) {
    window.location.href = `${pathname}?cycle=${cycleId}`;
  }

  function handleAddCycle() {
    startTransition(async () => {
      const cycle = await createCycle(studentId);
      window.location.href = `${pathname}?cycle=${cycle.id}`;
    });
  }

  function handleAddStory() {
    startTransition(async () => {
      const story = await createStandaloneStory(studentId);
      const storiesPath = pathname.replace(/\/cycles$/, "/stories");
      window.location.href = `${storiesPath}?story=${story.id}`;
    });
  }

  async function handleDeleteCycle() {
    const activeTitle = cycles.find((c) => c.id === activeCycleId)?.title || "Без названия";
    if (!(await siteConfirm(`Удалить цикл «${activeTitle}» вместе со всеми рассказами? Это нельзя отменить.`))) {
      return;
    }
    startTransition(async () => {
      await deleteCycle(activeCycleId);
      const remaining = cycles.filter((c) => c.id !== activeCycleId);
      window.location.href = remaining.length > 0 ? `${pathname}?cycle=${remaining[0].id}` : pathname;
    });
  }

  return (
    <div className={inline ? "flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2 mb-6"}>
      {!inline && (
        <label className="text-[13px]" style={{ color: "var(--faded)" }}>
          Цикл:
        </label>
      )}
      <select
        value={activeCycleId}
        onChange={(e) => handleChange(e.target.value)}
        className="min-w-0 max-w-full text-[14px] bg-white rounded-full px-4 h-11"
        style={{ border: "1px solid var(--border)" }}
      >
        {cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title || "Без названия"}
          </option>
        ))}
      </select>
      <button type="button" onClick={handleAddCycle} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
        <Plus size={16} /> Новый цикл
      </button>
      <button type="button" onClick={handleAddStory} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto", background: "var(--soft)", fontWeight: 500 }}>
        <Plus size={16} /> Новый рассказ
      </button>
      <button
        type="button"
        onClick={handleDeleteCycle}
        className="rounded-full px-4 text-[13.5px]"
        style={{ height: 44, border: "1px solid var(--border)", background: "#fff" }}
      >
        удалить цикл
      </button>
    </div>
  );
}
