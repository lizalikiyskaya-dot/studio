"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { createBook, deleteBook } from "./actions";
import { Button } from "@/components/ui/Button";

export default function BookSwitcher({
  studentId,
  books,
  activeBookId,
}: {
  studentId: string;
  books: { id: string; title: string }[];
  activeBookId: string;
}) {
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function handleChange(bookId: string) {
    window.location.href = `${pathname}?book=${bookId}`;
  }

  function handleAddBook() {
    startTransition(async () => {
      const book = await createBook(studentId);
      window.location.href = `${pathname}?book=${book.id}`;
    });
  }

  function handleDeleteBook() {
    const activeTitle = books.find((b) => b.id === activeBookId)?.title || "Без названия";
    if (!window.confirm(`Удалить книгу «${activeTitle}» вместе с планом глав? Это нельзя отменить.`)) {
      return;
    }
    startTransition(async () => {
      await deleteBook(activeBookId);
      const remaining = books.filter((b) => b.id !== activeBookId);
      window.location.href = remaining.length > 0 ? `${pathname}?book=${remaining[0].id}` : pathname;
    });
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <label className="text-[13px]" style={{ color: "var(--faded)" }}>
        Книга:
      </label>
      <select
        value={activeBookId}
        onChange={(e) => handleChange(e.target.value)}
        className="text-[14px] bg-white rounded-sm px-2 py-1"
        style={{ border: "1px solid var(--rule)" }}
      >
        {books.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title || "Без названия"}
          </option>
        ))}
      </select>
      <Button onClick={handleAddBook} variant="dashed" size="sm" pill>
        + новая книга
      </Button>
      <Button onClick={handleDeleteBook} variant="secondary" size="sm" pill>
        удалить книгу
      </Button>
    </div>
  );
}
