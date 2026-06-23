"use client";

import { useTransition } from "react";
import type { Book } from "@/generated/prisma/client";
import { updateGrapesField, type GrapesField } from "./actions";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";

const ROWS: { field: GrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "G", label: "География" },
  { field: "grapesReligion", letter: "R", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "A", label: "Достижения" },
  { field: "grapesPolitics", letter: "P", label: "Политика" },
  { field: "grapesEconomy", letter: "E", label: "Экономика" },
  { field: "grapesSocial", letter: "S", label: "Соц. структура" },
];

export default function GrapesTable({ bookId, book }: { bookId: string; book: Book }) {
  const [, startTransition] = useTransition();

  function handleSave(field: GrapesField, value: string) {
    startTransition(() => updateGrapesField(bookId, field, value));
  }

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
          <AutoGrowTextarea
            defaultValue={book[field]}
            onBlur={(v) => handleSave(field, v)}
            className="flex-1 outline-none bg-transparent text-[13.5px] leading-snug"
          />
        </div>
      ))}
    </div>
  );
}
