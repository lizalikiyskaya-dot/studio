"use client";

import type { Cycle } from "@/generated/prisma/client";
import type { CycleGrapesField } from "./actions";
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
        <div key={field} className="rounded-[16px] p-3" style={{ background: "var(--soft)" }}>
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
            <span className="grid h-5 w-5 place-items-center rounded-[14px] bg-white text-[11px] font-bold">{letter}</span>
            {label}
          </div>
          <SuggestableField
            model="Cycle"
            recordId={cycleId}
            field={field}
            value={cycle[field]}
            suggestion={suggestions[field]}
            placeholder="Коротко, своими словами"
            className="mt-1.5 w-full bg-transparent text-[13px] leading-snug outline-none"
          />
        </div>
      ))}
    </div>
  );
}
