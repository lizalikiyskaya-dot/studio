"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { WorkshopBook } from "@/lib/workshopBooks";

function formatChars(value: number) {
  return value.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

export default function WorkshopBookCard({ books }: { books: WorkshopBook[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  if (books.length === 0) {
    return (
      <div className="side-card !p-2.5">
        <div className="relative h-[108px] overflow-hidden rounded-[14px]" style={{ background: "var(--deep)" }}>
          <span aria-hidden="true" className="absolute -bottom-7 -right-3 h-20 w-20 rounded-full" style={{ background: "var(--y)" }} />
          <span aria-hidden="true" className="absolute right-8 top-3 h-7 w-7 rounded-full" style={{ background: "var(--vi)" }} />
          <div className="relative max-w-[78%] p-3 text-[15px] font-semibold leading-tight text-white">Книга ещё не заведена</div>
        </div>
        <p className="mt-2 px-0.5 text-[12px] leading-snug" style={{ color: "var(--muted)" }}>
          Обложка и объём появятся здесь, когда книга будет создана.
        </p>
      </div>
    );
  }

  const requested = searchParams.get("book");
  const found = books.findIndex((book) => book.id === requested);
  const index = found >= 0 ? found : 0;
  const book = books[index];
  const meta = [book.genre.trim(), book.partsCount.trim()].filter(Boolean).join(" · ");
  const progress = book.planned > 0 ? Math.max(0, Math.min(100, (book.written / book.planned) * 100)) : 0;

  function openBook(bookId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("book", bookId);
    setOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="side-card !p-2.5">
      <div className="relative h-[108px] overflow-hidden rounded-[14px]" style={{ background: "#241848" }}>
        {book.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span aria-hidden="true" className="absolute -bottom-8 -right-4 h-[92px] w-[92px] rounded-full" style={{ background: "var(--y)" }} />
            <span aria-hidden="true" className="absolute right-7 top-3.5 h-8 w-8 rounded-full" style={{ background: "#7c6cf0" }} />
          </>
        )}
        {book.imageUrl ? <span className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,16,40,.15), rgba(20,16,40,.55))" }} /> : null}
        <div className="relative max-w-[78%] p-3 text-[15px] font-semibold leading-tight text-white">
          {book.title.trim() || "Без названия"}
        </div>
      </div>

      <div className="relative mt-2.5 flex items-start justify-between gap-2 px-0.5" ref={menuRef}>
        <div className="min-w-0 text-[12px] leading-snug" style={{ color: "var(--muted)" }}>
          {meta || "Форма не указана"}
        </div>
        {books.length > 1 && (
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-semibold"
            aria-expanded={open}
            aria-haspopup="listbox"
            onClick={() => setOpen((value) => !value)}
          >
            {index + 1} из {books.length}
            <ChevronDown size={14} />
          </button>
        )}
        {books.length > 1 && open && (
          <ul
            role="listbox"
            className="absolute right-0 top-6 z-10 m-0 min-w-[180px] list-none rounded-[14px] p-1"
            style={{ background: "#fff", border: "1px solid var(--border)", boxShadow: "0 10px 28px rgba(32,32,32,.12)" }}
          >
            {books.map((item, itemIndex) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === book.id}
                  className="w-full rounded-[10px] px-2.5 py-1.5 text-left text-[13px]"
                  style={{ background: item.id === book.id ? "var(--soft)" : "transparent", fontWeight: item.id === book.id ? 650 : 500 }}
                  onClick={() => openBook(item.id)}
                >
                  {itemIndex + 1}. {item.title.trim() || "Без названия"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "var(--soft)" }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--ink)" }} />
      </div>
      <div className="mt-1.5 px-0.5 text-[12px]" style={{ color: "var(--muted)" }}>
        {book.planned > 0
          ? `${formatChars(book.written)} из ${formatChars(book.planned)} знаков`
          : "Объём пока не задан"}
      </div>
    </div>
  );
}
