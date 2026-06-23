"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { createBook, deleteBook } from "./actions";

export default function BookSwitcher({
  studentId,
  books,
  activeBookId,
}: {
  studentId: string;
  books: { id: string; title: string }[];
  activeBookId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function handleChange(bookId: string) {
    router.push(`${pathname}?book=${bookId}`);
  }

  function handleAddBook() {
    startTransition(async () => {
      const book = await createBook(studentId);
      router.push(`${pathname}?book=${book.id}`);
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
      if (remaining.length > 0) {
        router.push(`${pathname}?book=${remaining[0].id}`);
      } else {
        router.push(pathname);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <label className="font-mono-label text-[10px] uppercase tracking-wide" style={{ color: "var(--faded)" }}>
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
      <button
        onClick={handleAddBook}
        className="font-mono-label text-[11px] px-2.5 py-1 rounded-sm"
        style={{ color: "var(--sage)", border: "1px solid var(--sage)" }}
      >
        + новая книга
      </button>
      <button
        onClick={handleDeleteBook}
        className="font-mono-label text-[11px] px-2.5 py-1 rounded-sm"
        style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
      >
        Удалить книгу
      </button>
    </div>
  );
}
