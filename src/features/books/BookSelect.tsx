"use client";

import { useRouter, usePathname } from "next/navigation";

export default function BookSelect({
  books,
  activeBookId,
}: {
  books: { id: string; title: string }[];
  activeBookId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(bookId: string) {
    router.push(`${pathname}?book=${bookId}`);
    router.refresh();
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
    </div>
  );
}
