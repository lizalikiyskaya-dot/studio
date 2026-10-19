"use client";

import type { GrapesField } from "./actions";
import type { SuggestableModel } from "@/lib/suggestionRegistry";
import GrapesLetterCard from "@/components/GrapesLetterCard";
import SuggestableField from "@/features/suggestions/SuggestableField";

const ROWS: { field: GrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "Г", label: "География" },
  { field: "grapesReligion", letter: "Р", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "Д", label: "Достижения" },
  { field: "grapesPolitics", letter: "П", label: "Политика" },
  { field: "grapesEconomy", letter: "Э", label: "Экономика" },
  { field: "grapesSocial", letter: "С", label: "Соц. структура" },
];

// Одна и та же таблица и для основного сеттинга (поля Book),
// и для добавленных кнопкой «добавить сеттинг» (GrapesSetting).
export default function GrapesTable({
  model = "Book",
  recordId,
  values,
  suggestions,
}: {
  model?: Extract<SuggestableModel, "Book" | "GrapesSetting">;
  recordId: string;
  values: Record<GrapesField, string>;
  suggestions: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {ROWS.map(({ field, letter, label }) => (
        <GrapesLetterCard key={field} letter={letter} label={label}>
          <SuggestableField
            model={model}
            recordId={recordId}
            field={field}
            value={values[field]}
            suggestion={suggestions[field]}
            placeholder="Коротко, своими словами"
            className="w-full bg-transparent text-[13px] leading-snug outline-none"
          />
        </GrapesLetterCard>
      ))}
    </div>
  );
}
