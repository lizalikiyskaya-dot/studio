"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { Story, CycleCharacter, CycleWorldEntry, StoryCharacter, StoryWorldEntry } from "@/generated/prisma/client";
import { createStory, createStandaloneStory, deleteStory } from "./actions";
import StoryDetail from "./StoryDetail";
import EmptyState from "@/components/EmptyState";
import { useHeaderAction } from "@/components/headerAction";

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
  settingManifest?: number | null;
  settingFilter?: number | null;
  settingConflict?: number | null;
  settingMagnet?: number | null;
  fantasyGeneral?: string;
  fantasyNotes?: string;
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
  headerAdd = false,
}: {
  cycleId: string | null;
  studentId: string;
  stories: Story[];
  cycleCharacters: CycleCharacter[];
  cycleWorldEntries: CycleWorldEntry[];
  storyCharacters: StoryCharacter[];
  storyWorldEntries: StoryWorldEntry[];
  cycleSetting?: CycleSettingSnap;
  headerAdd?: boolean;
}) {
  const router = useRouter();
  const requested = useSearchParams().get("story");
  const [openId, setOpenId] = useState<string | null>(
    requested && stories.some((story) => story.id === requested) ? requested : null
  );
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const story = cycleId ? await createStory(cycleId) : await createStandaloneStory(studentId);
      setOpenId(story.id);
      router.refresh();
    });
  }
  useHeaderAction(headerAdd ? "story-add" : "story-add-inline", handleAdd);

  async function handleDelete(storyId: string) {
    if (!(await siteConfirm("Удалить рассказ? Это нельзя отменить."))) return;
    startTransition(async () => {
      await deleteStory(storyId);
      if (openId === storyId) setOpenId(null);
      router.refresh();
    });
  }

  if (stories.length === 0) {
    return (
      <EmptyState
        cue="Самое время написать рассказ"
        detail={cycleId ? "Рассказы этого цикла появятся здесь." : "Отдельные рассказы появятся здесь."}
        action={
          headerAdd ? undefined : (
            <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
              <Plus size={16} /> Новый рассказ
            </button>
          )
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2">
        {stories.map((story) => {
          const open = story.id === openId;
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => setOpenId(open ? null : story.id)}
              className={`hover-lift rounded-[18px] px-4 py-3 text-left${open ? " is-on" : ""}`}
              style={{ border: "1px solid var(--border)", background: "#fff", "--card-ring": "#2b2d5c" }}
            >
              <span className="heading block text-[18px] font-semibold leading-tight">{story.title || "Без названия"}</span>
              {(story.logline || story.genre) ? (
                <span className="mt-1 block text-[13px] leading-snug" style={{ color: "var(--ink2)" }}>{story.logline || story.genre}</span>
              ) : null}
            </button>
          );
        })}
        {!headerAdd && (
          <button type="button" onClick={handleAdd} className="btn-y mt-1 px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Новый рассказ
          </button>
        )}
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
