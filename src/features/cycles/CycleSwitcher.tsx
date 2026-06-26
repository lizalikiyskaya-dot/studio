"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { createCycle, deleteCycle } from "./actions";

export default function CycleSwitcher({
  studentId,
  cycles,
  activeCycleId,
}: {
  studentId: string;
  cycles: { id: string; title: string }[];
  activeCycleId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function handleChange(cycleId: string) {
    router.push(`${pathname}?cycle=${cycleId}`);
    router.refresh();
  }

  function handleAddCycle() {
    startTransition(async () => {
      const cycle = await createCycle(studentId);
      router.push(`${pathname}?cycle=${cycle.id}`);
      router.refresh();
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
      if (remaining.length > 0) {
        router.push(`${pathname}?cycle=${remaining[0].id}`);
      } else {
        router.push(pathname);
      }
      router.refresh();
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
      <button
        onClick={handleAddCycle}
        className="text-[12.5px] px-2.5 py-1 rounded-sm"
        style={{ color: "var(--sage)", border: "1px solid var(--sage)" }}
      >
        + новый цикл
      </button>
      <button
        onClick={handleDeleteCycle}
        className="text-[12.5px] px-2.5 py-1 rounded-sm"
        style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
      >
        Удалить цикл
      </button>
    </div>
  );
}
