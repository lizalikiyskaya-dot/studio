"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { manuscriptLastKey, type WriteChapter } from "@/lib/writeChapterKey";

export default function WriteStart({
  basePath,
  bookIds,
  chapters,
}: {
  basePath: string;
  bookIds: string[];
  chapters: WriteChapter[];
}) {
  const search = useSearchParams();
  const requested = search.get("book");
  const bookId = requested && bookIds.includes(requested) ? requested : bookIds[0] ?? null;
  const mine = bookId ? chapters.filter((chapter) => chapter.bookId === bookId) : [];
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!bookId) {
        setSavedId(null);
        return;
      }
      try {
        setSavedId(localStorage.getItem(manuscriptLastKey(bookId)));
      } catch {
        setSavedId(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bookId, chapters]);

  const chapter = mine.find((item) => item.id === savedId) ?? mine[mine.length - 1] ?? null;
  const title = chapter?.title.trim() || "Без названия";
  const query = new URLSearchParams();
  query.set("part", "write");
  if (bookId) query.set("book", bookId);
  if (chapter) {
    query.set("focus", "1");
    query.set("chapter", chapter.id);
  }
  const subtitle = chapter ? `Глава «${title}» на весь экран` : "Откроется раздел «Писать»";

  return (
    <Link href={`${basePath}/drafts?${query.toString()}`} className="write-start">
      <span>
        <b>Начать писать!</b>
        <span>{subtitle}</span>
      </span>
      <svg viewBox="0 0 24 24" width="58" height="58" aria-hidden="true">
        <path fill="none" stroke="#f7f3ea" strokeWidth="1.6" strokeLinejoin="round" d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path fill="none" stroke="#ffd43b" strokeWidth="1.6" strokeLinecap="round" d="m15 5 4 4" />
      </svg>
    </Link>
  );
}
