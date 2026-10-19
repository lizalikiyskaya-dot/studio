"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WorkshopBook } from "@/lib/workshopBooks";

function formatChars(value: number) {
  return value.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

export default function WorkshopBookCard({ books }: { books: WorkshopBook[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (books.length === 0) {
    return (
      <div className="side-card">
        <div className="text-[14.5px] font-semibold">Книга ещё не заведена</div>
        <p className="mt-1 text-[12.5px] leading-snug" style={{ color: "var(--muted)" }}>
          Обложка и объём появятся здесь, когда книга будет создана.
        </p>
      </div>
    );
  }

  const requested = searchParams.get("book");
  const index = Math.max(0, books.findIndex((book) => book.id === requested));
  const book = books[index] ?? books[0];
  const meta = [book.genre.trim(), book.partsCount.trim()].filter(Boolean).join(" · ");
  const progress = book.planned > 0 ? Math.max(0, Math.min(100, Math.round((book.written / book.planned) * 100))) : 0;

  function openAt(nextIndex: number) {
    const next = books[nextIndex];
    if (!next) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("book", next.id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="side-card !p-3">
      <div className="flex gap-3">
        <div
          className="relative h-[76px] w-[54px] shrink-0 overflow-hidden rounded-[8px]"
          style={{ background: book.imageUrl ? "#fff" : "var(--y)" }}
        >
          {book.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-0 h-7 w-3.5 -translate-x-1/2"
              style={{ background: "var(--deep)", clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)" }}
            />
          )}
        </div>
        <div className="min-w-0 pt-0.5">
          <div className="text-[14.5px] font-semibold leading-tight">{book.title.trim() || "Без названия"}</div>
          <div className="mt-1 text-[12px] leading-snug" style={{ color: "var(--muted)" }}>
            {meta || "Форма не указана"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-full"
          style={{ background: "var(--soft)", color: "var(--ink)", opacity: index === 0 ? 0.35 : 1 }}
          disabled={index === 0}
          onClick={() => openAt(index - 1)}
          aria-label="Предыдущая книга"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[12.5px] font-medium">
          {index + 1} из {books.length}
        </span>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-full"
          style={{ background: "var(--soft)", color: "var(--ink)", opacity: index >= books.length - 1 ? 0.35 : 1 }}
          disabled={index >= books.length - 1}
          onClick={() => openAt(index + 1)}
          aria-label="Следующая книга"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
        <div className="h-full rounded-full" style={{ width: `${book.planned > 0 ? progress : 0}%`, background: "var(--y)" }} />
      </div>
      <div className="mt-1.5 text-[12px]" style={{ color: "var(--muted)" }}>
        {book.planned > 0
          ? `${formatChars(book.written)} из ${formatChars(book.planned)} знаков`
          : "Объём пока не задан"}
      </div>
    </div>
  );
}
