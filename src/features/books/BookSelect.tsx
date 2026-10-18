"use client";

import { usePathname } from "next/navigation";

export default function BookSelect({
  books,
  activeBookId,
  compact = false,
}: {
  books: { id: string; title: string }[];
  activeBookId: string;
  compact?: boolean;
}) {
  const pathname = usePathname();

  function handleChange(bookId: string) {
    window.location.href = `${pathname}?book=${bookId}`;
  }

  return (
    <div className={compact ? "flex items-center" : "flex items-center gap-3 mb-6"}>
      {!compact && (
        <label className="text-[13px]" style={{ color: "var(--faded)" }}>
          Книга:
        </label>
      )}
      <select
        value={activeBookId}
        onChange={(e) => handleChange(e.target.value)}
        className="text-[14px] bg-white rounded-full px-4 h-11"
        style={{ border: "1px solid var(--border)", maxWidth: compact ? 220 : undefined }}
      >
        {books.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title || "Без названия"}
          </option>
        ))}
      </select>
    </div>
  );
}
