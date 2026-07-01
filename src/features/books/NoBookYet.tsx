"use client";

import { useTransition } from "react";
import { createBook } from "./actions";
import { Button } from "@/components/ui/Button";

export default function NoBookYet({ studentId }: { studentId: string }) {
  const [, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const book = await createBook(studentId);
      window.location.href = `?book=${book.id}`;
    });
  }

  return (
    <div>
      <p className="text-[14px] mb-4" style={{ color: "var(--faded)" }}>
        У ученика пока нет ни одной книги.
      </p>
      <Button onClick={handleCreate} variant="dashed" pill>
        + новая книга
      </Button>
    </div>
  );
}
