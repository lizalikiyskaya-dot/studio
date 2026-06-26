"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createCycle } from "./actions";

export default function NoCycleYet({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const cycle = await createCycle(studentId);
      router.push(`?cycle=${cycle.id}`);
      router.refresh();
    });
  }

  return (
    <div>
      <p className="text-[14px] mb-4" style={{ color: "var(--faded)" }}>
        У ученика пока нет ни одного цикла рассказов.
      </p>
      <button
        onClick={handleCreate}
        className="text-[13px] px-3 py-2 rounded-sm"
        style={{ background: "var(--wine)", color: "#fff" }}
      >
        + новый цикл
      </button>
    </div>
  );
}
