"use client";

import type { Cycle } from "@/generated/prisma/client";
import type { CycleGrapesField } from "./actions";
import GrapesLetterCard from "@/components/GrapesLetterCard";
import SuggestableField from "@/features/suggestions/SuggestableField";

const ROWS: { field: CycleGrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "Г", label: "География" },
  { field: "grapesReligion", letter: "Р", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "Д", label: "Достижения" },
  { field: "grapesPolitics", letter: "П", label: "Политика" },
  { field: "grapesEconomy", letter: "Э", label: "Экономика" },
  { field: "grapesSocial", letter: "С", label: "Соц. структура" },
];

export default function CycleGrapesTable({
  cycleId,
  cycle,
  suggestions,
}: {
  cycleId: string;
  cycle: Cycle;
  suggestions: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {ROWS.map(({ field, letter, label }) => (
        <GrapesLetterCard key={field} letter={letter} label={label}>
          <SuggestableField
            model="Cycle"
            recordId={cycleId}
            field={field}
            value={cycle[field]}
            suggestion={suggestions[field]}
            placeholder="Коротко, своими словами"
            className="w-full bg-transparent text-[13px] leading-snug outline-none"
          />
        </GrapesLetterCard>
      ))}
    </div>
  );
}
