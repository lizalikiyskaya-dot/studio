"use client";

import type { StoryGrapesField } from "./actions";
import { updateStoryGrapesField } from "./actions";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import GrapesLetterCard, { GrapesSection } from "@/components/GrapesLetterCard";
import ReadingText from "@/components/ReadingText";
import { useTransition } from "react";

const ROWS: { field: StoryGrapesField; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "Г", label: "География" },
  { field: "grapesReligion", letter: "Р", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "Д", label: "Достижения" },
  { field: "grapesPolitics", letter: "П", label: "Политика" },
  { field: "grapesEconomy", letter: "Э", label: "Экономика" },
  { field: "grapesSocial", letter: "С", label: "Соц. структура" },
];

export default function StoryGrapesTable({
  story,
  canEdit = true,
  onSaved,
}: {
  story: { id: string } & Record<StoryGrapesField, string>;
  canEdit?: boolean;
  onSaved?: (field: StoryGrapesField, value: string) => void;
}) {
  const [, startTransition] = useTransition();

  return (
    <GrapesSection>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {ROWS.map(({ field, letter, label }) => (
          <GrapesLetterCard key={field} letter={letter} label={label}>
            {canEdit ? (
              <AutoGrowTextarea
                defaultValue={story[field]}
                onBlur={(value) => startTransition(() => {
                  onSaved?.(field, value);
                  void updateStoryGrapesField(story.id, field, value);
                })}
                placeholder="Коротко, своими словами"
                className="w-full bg-transparent text-[13px] leading-snug outline-none"
              />
            ) : story[field] ? (
              <ReadingText text={story[field]} />
            ) : (
              <p className="text-[13px]" style={{ color: "var(--muted)" }}>Пока пусто</p>
            )}
          </GrapesLetterCard>
        ))}
      </div>
    </GrapesSection>
  );
}
