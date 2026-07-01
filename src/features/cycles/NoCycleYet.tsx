"use client";

import { useTransition } from "react";
import { createCycle } from "./actions";
import { Button } from "@/components/ui/Button";

export default function NoCycleYet({ studentId }: { studentId: string }) {
  const [, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const cycle = await createCycle(studentId);
      window.location.href = `?cycle=${cycle.id}`;
    });
  }

  return (
    <div>
      <p className="text-[14px] mb-4" style={{ color: "var(--faded)" }}>
        У ученика пока нет ни одного цикла рассказов.
      </p>
      <Button onClick={handleCreate} variant="success" pill>
        + новый цикл
      </Button>
    </div>
  );
}
