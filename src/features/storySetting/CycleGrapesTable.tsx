"use client";

import type { Cycle } from "@/generated/prisma/client";
import type { CycleGrapesField } from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";

const ROWS: { field: CycleGrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "G", label: "География" },
  { field: "grapesReligion", letter: "R", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "A", label: "Достижения" },
  { field: "grapesPolitics", letter: "P", label: "Политика" },
  { field: "grapesEconomy", letter: "E", label: "Экономика" },
  { field: "grapesSocial", letter: "S", label: "Соц. структура" },
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
            model="Cycle"
            recordId={cycleId}
            field={field}
            value={cycle[field]}
            suggestion={suggestions[field]}
            className="flex-1 outline-none bg-transparent text-[13.5px] leading-snug"
          />
        </div>
      ))}
    </div>
  );
}
