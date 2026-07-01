"use client";

import type { Story } from "@/generated/prisma/client";
import type { StoryGrapesField } from "./actions";
import { updateStoryGrapesField } from "./actions";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { useTransition } from "react";

const ROWS: { field: StoryGrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "G", label: "География" },
  { field: "grapesReligion", letter: "R", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "A", label: "Достижения" },
  { field: "grapesPolitics", letter: "P", label: "Политика" },
  { field: "grapesEconomy", letter: "E", label: "Экономика" },
  { field: "grapesSocial", letter: "S", label: "Соц. структура" },
];

export default function StoryGrapesTable({ story }: { story: Story }) {
  const [, startTransition] = useTransition();

  return (
    <div>
      {ROWS.map(({ field, letter, label }) => (
        <div key={field} className="flex gap-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div
            className="heading w-[180px] flex-shrink-0 font-semibold text-[15px] pr-4 border-r"
            style={{ color: "var(--accent)", borderColor: "var(--border)" }}
          >
            <span className="font-bold mr-2" style={{ color: "var(--ink)" }}>{letter}</span>
            {label}
          </div>
          <AutoGrowTextarea
            defaultValue={story[field]}
            onBlur={(v) => startTransition(() => updateStoryGrapesField(story.id, field, v))}
            className="flex-1 outline-none bg-transparent text-[13.5px] leading-snug py-0.5"
          />
        </div>
      ))}
    </div>
  );
}
