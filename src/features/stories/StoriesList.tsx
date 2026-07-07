"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Story, CycleCharacter, CycleWorldEntry, StoryCharacter, StoryWorldEntry } from "@/generated/prisma/client";
import { createStory, createStandaloneStory, deleteStory } from "./actions";
import StoryDetail from "./StoryDetail";
import { Button } from "@/components/ui/Button";

type CycleSettingSnap = {
  grapesGeography: string;
  grapesReligion: string;
  grapesAchievements: string;
  grapesPolitics: string;
  grapesEconomy: string;
  grapesSocial: string;
  settingPhotoUrl: string | null;
  settingChips: string[];
  settingMapX: number | null;
  settingMapY: number | null;
};

export default function StoriesList({
  cycleId,
  studentId,
  stories,
  cycleCharacters,
  cycleWorldEntries,
  storyCharacters,
  storyWorldEntries,
  cycleSetting,
}: {
  cycleId: string | null;
  studentId: string;
  stories: Story[];
  cycleCharacters: CycleCharacter[];
  cycleWorldEntries: CycleWorldEntry[];
  storyCharacters: StoryCharacter[];
  storyWorldEntries: StoryWorldEntry[];
  cycleSetting?: CycleSettingSnap;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(stories[0]?.id ?? null);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const story = cycleId ? await createStory(cycleId) : await createStandaloneStory(studentId);
      setOpenId(story.id);
      router.refresh();
    });
  }

  function handleDelete(storyId: string) {
    if (!window.confirm("Удалить рассказ? Это нельзя отменить.")) return;
    startTransition(async () => {
      await deleteStory(storyId);
      if (openId === storyId) setOpenId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => setOpenId(story.id === openId ? null : story.id)}
            className="text-[13px] px-4 py-1.5 rounded-full transition-colors"
            style={{
              border: `1px solid var(--gold)`,
              background: openId === story.id ? "var(--gold)" : "transparent",
              color: openId === story.id ? "#fff" : "var(--gold)",
            }}
          >
            {story.title || "Без названия"}
          </button>
        ))}
        <Button onClick={handleAdd} variant="success" size="sm" pill>
          + новый рассказ
        </Button>
      </div>

      {stories
        .filter((s) => s.id === openId)
        .map((story) => (
          <StoryDetail
            key={story.id}
            story={story}
            cycleCharacters={cycleCharacters}
            cycleWorldEntries={cycleWorldEntries}
            storyCharacters={storyCharacters.filter((c) => c.storyId === story.id)}
            storyWorldEntries={storyWorldEntries.filter((e) => e.storyId === story.id)}
            cycleSetting={cycleSetting}
            onDelete={() => handleDelete(story.id)}
          />
        ))}
    </div>
  );
}
