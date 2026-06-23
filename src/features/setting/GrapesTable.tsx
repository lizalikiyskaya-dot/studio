"use client";

import type { Book } from "@/generated/prisma/client";
import type { GrapesField } from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";

const ROWS: { field: GrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "G", label: "География" },
  { field: "grapesReligion", letter: "R", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "A", label: "Достижения" },
  { field: "grapesPolitics", letter: "P", label: "Политика" },
  { field: "grapesEconomy", letter: "E", label: "Экономика" },
  { field: "grapesSocial", letter: "S", label: "Соц. структура" },
];

export default function GrapesTable({
  bookId,
  book,
  suggestions,
}: {
  bookId: string;
  book: Book;
  suggestions: Record<string, string>;
}) {
  return (
    <div>
      {ROWS.map(({ field, letter, label }) => (
        <div key={field} className="flex gap-4 py-3 border-b" style={{ borderColor: "var(--rule)" }}>
          <div
            className="w-[180px] flex-shrink-0 font-semibold text-[15px] pr-4 border-r"
            style={{ color: "var(--wine)", borderColor: "var(--rule)" }}
          >
            <span className="font-bold mr-2" style={{ color: "var(--ink)" }}>
              {letter}
            </span>
            {label}
          </div>
          <SuggestableField
            model="Book"
            recordId={bookId}
            field={field}
            value={book[field]}
            suggestion={suggestions[field]}
            className="flex-1 outline-none bg-transparent text-[13.5px] leading-snug"
          />
        </div>
      ))}
    </div>
  );
}
