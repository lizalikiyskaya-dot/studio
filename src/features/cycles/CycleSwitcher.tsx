"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { createCycle, deleteCycle } from "./actions";
import { Button } from "@/components/ui/Button";

export default function CycleSwitcher({
  studentId,
  cycles,
  activeCycleId,
}: {
  studentId: string;
  cycles: { id: string; title: string }[];
  activeCycleId: string;
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

  function handleDeleteCycle() {
    const activeTitle = cycles.find((c) => c.id === activeCycleId)?.title || "Без названия";
    if (!window.confirm(`Удалить цикл «${activeTitle}» вместе со всеми рассказами? Это нельзя отменить.`)) {
      return;
    }
    startTransition(async () => {
      await deleteCycle(activeCycleId);
      const remaining = cycles.filter((c) => c.id !== activeCycleId);
      window.location.href = remaining.length > 0 ? `${pathname}?cycle=${remaining[0].id}` : pathname;
    });
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <label className="text-[13px]" style={{ color: "var(--faded)" }}>
        Цикл:
      </label>
      <select
        value={activeCycleId}
        onChange={(e) => handleChange(e.target.value)}
        className="text-[14px] bg-white rounded-sm px-2 py-1"
        style={{ border: "1px solid var(--rule)" }}
      >
        {cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title || "Без названия"}
          </option>
        ))}
      </select>
      <Button onClick={handleAddCycle} variant="dashed" size="sm" pill>
        + новый цикл
      </Button>
      <Button onClick={handleDeleteCycle} variant="secondary" size="sm" pill>
        удалить цикл
      </Button>
    </div>
  );
}
