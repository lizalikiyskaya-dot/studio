"use client";

import type { Story } from "@/generated/prisma/client";
import type { StoryGrapesField } from "./actions";
import { updateStoryGrapesField } from "./actions";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import GrapesLetterCard from "@/components/GrapesLetterCard";
import { useTransition } from "react";

const ROWS: { field: StoryGrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "Г", label: "География" },
  { field: "grapesReligion", letter: "Р", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "Д", label: "Достижения" },
  { field: "grapesPolitics", letter: "П", label: "Политика" },
  { field: "grapesEconomy", letter: "Э", label: "Экономика" },
  { field: "grapesSocial", letter: "С", label: "Соц. структура" },
];

export default function StoryGrapesTable({ story }: { story: Story }) {
  const [, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {ROWS.map(({ field, letter, label }) => (
        <GrapesLetterCard key={field} letter={letter} label={label}>
          <AutoGrowTextarea
            defaultValue={story[field]}
            onBlur={(value) => startTransition(() => updateStoryGrapesField(story.id, field, value))}
            placeholder="Коротко, своими словами"
            className="w-full bg-transparent text-[13px] leading-snug outline-none"
          />
        </GrapesLetterCard>
      ))}
    </div>
  );
}
