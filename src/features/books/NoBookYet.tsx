"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createBook } from "./actions";

export default function NoBookYet({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const book = await createBook(studentId);
      router.push(`?book=${book.id}`);
      router.refresh();
    });
  }

  return (
    <div>
      <p className="text-[14px] mb-4" style={{ color: "var(--faded)" }}>
        У ученика пока нет ни одной книги.
      </p>
      <button
        onClick={handleCreate}
        className="text-[13px] px-3 py-2 rounded-sm"
        style={{ background: "var(--wine)", color: "#fff" }}
      >
        + новая книга
      </button>
    </div>
  );
}
