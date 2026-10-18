"use client";

import type { GrapesField } from "./actions";
import type { SuggestableModel } from "@/lib/suggestionRegistry";
import SuggestableField from "@/features/suggestions/SuggestableField";

const ROWS: { field: GrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "G", label: "География" },
  { field: "grapesReligion", letter: "R", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "A", label: "Достижения" },
  { field: "grapesPolitics", letter: "P", label: "Политика" },
  { field: "grapesEconomy", letter: "E", label: "Экономика" },
  { field: "grapesSocial", letter: "S", label: "Соц. структура" },
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
    <div>
      {ROWS.map(({ field, letter, label }) => (
        <div key={field} className="flex gap-4 py-3 border-b" style={{ borderColor: "var(--rule)" }}>
          <div
            className="heading w-[180px] flex-shrink-0 font-semibold text-[15px] pr-4 border-r"
            style={{ color: "var(--wine)", borderColor: "var(--rule)" }}
          >
            <span className="font-bold mr-2" style={{ color: "var(--ink)" }}>
              {letter}
            </span>
            {label}
          </div>
          <SuggestableField
            model={model}
            recordId={recordId}
            field={field}
            value={values[field]}
            suggestion={suggestions[field]}
            className="flex-1 outline-none bg-transparent text-[13.5px] leading-snug"
          />
        </div>
      ))}
    </div>
  );
}
