"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { createBook, deleteBook } from "./actions";
import { Button } from "@/components/ui/Button";

export default function BookSwitcher({
  studentId,
  books,
  activeBookId,
  inline = false,
}: {
  studentId: string;
  books: { id: string; title: string }[];
  activeBookId: string;
  inline?: boolean;
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
    <div className={inline ? "flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-3 mb-6"}>
      {!inline && (
        <label className="text-[13px]" style={{ color: "var(--faded)" }}>
          Книга:
        </label>
      )}
      <select
        value={activeBookId}
        onChange={(e) => handleChange(e.target.value)}
        className="min-w-0 max-w-full text-[14px] bg-white rounded-full px-4 h-11"
        style={{ border: "1px solid var(--border)" }}
      >
        {books.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title || "Без названия"}
          </option>
        ))}
      </select>
      <Button onClick={handleAddBook} variant="secondary" size="sm" pill>
        + новая книга
      </Button>
      <Button onClick={handleDeleteBook} variant="secondary" size="sm" pill>
        удалить книгу
      </Button>
    </div>
  );
}
