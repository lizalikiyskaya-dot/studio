"use client";

import { useTransition } from "react";
import { Plus } from "lucide-react";
import { createBook } from "./actions";
import EmptyState from "@/components/EmptyState";

export default function NoBookYet({ studentId }: { studentId: string }) {
  const [, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const book = await createBook(studentId);
      window.location.href = `?book=${book.id}`;
    });
  }

  return (
    <EmptyState
      cue="Самое время завести книгу"
      detail="С неё начинается мастерская: о книге, план, персонажи."
      action={
        <button type="button" onClick={handleCreate} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
          <Plus size={16} /> Новая книга
        </button>
      }
    />
  );
}
