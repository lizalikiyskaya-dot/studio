"use client";

import type { Story, CycleWorldEntry, StoryWorldEntry } from "@/generated/prisma/client";
import StorySettingTypeSection from "./StorySettingTypeSection";
import WorldBible from "@/features/setting/WorldBible";
import { GRAPES_FIELDS, type GrapesBag } from "@/features/setting/worldBible";
import { describeShares, resolveShares } from "@/features/setting/settingMix";

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

function grapesOf(source: CycleSettingSnap): GrapesBag {
  const bag = {} as GrapesBag;
  for (const field of GRAPES_FIELDS) bag[field] = source[field] ?? "";
  return bag;
}

function SharedSettingType({ cycle }: { cycle: CycleSettingSnap }) {
  const view = describeShares(resolveShares({
    settingManifest: cycle.settingManifest ?? null,
    settingFilter: cycle.settingFilter ?? null,
    settingConflict: cycle.settingConflict ?? null,
    settingMagnet: cycle.settingMagnet ?? null,
    settingMapX: cycle.settingMapX,
    settingMapY: cycle.settingMapY,
  }));
  return (
    <section className="rounded-[24px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <h2 className="text-[17px] font-semibold">Тип сеттинга</h2>
      <p className="mt-2 text-[16px] font-semibold leading-snug">{view.title}</p>
      <p className="mt-1 text-[13px] leading-snug" style={{ color: "var(--ink2)" }}>{view.meaning}</p>
      {cycle.settingPhotoUrl ? (
        <div
          className="mt-3 h-[180px] w-full rounded-[14px] bg-cover bg-center"
          style={{ backgroundImage: `url(${cycle.settingPhotoUrl})` }}
        />
      ) : null}
    </section>
  );
}

export default function StorySettingSection({
  story,
  cycleWorldEntries,
  storyWorldEntries,
  cycleSetting,
}: {
  story: Story;
  cycleWorldEntries: CycleWorldEntry[];
  storyWorldEntries: StoryWorldEntry[];
  cycleSetting?: CycleSettingSnap;
}) {
  const isShared = story.settingSource === "SHARED" && !!story.cycleId && !!cycleSetting;

  const shared = isShared && cycleSetting ? cycleSetting : null;

  return (
    <div className="flex flex-col gap-4">
      {shared ? <SharedSettingType cycle={shared} /> : <StorySettingTypeSection story={story} />}
      {shared ? (
        <WorldBible
          scope="cycle"
          recordId={story.cycleId ?? story.id}
          tables={[{
            id: "primary",
            title: "Сеттинг цикла",
            model: "Cycle",
            recordId: story.cycleId ?? story.id,
            values: grapesOf(shared),
            suggestions: {},
            titleField: null,
          }]}
          entries={cycleWorldEntries}
          fantasyGeneral={shared.fantasyGeneral ?? ""}
          fantasyNotes={shared.fantasyNotes ?? ""}
          canEdit={false}
          allowTables={false}
          isMentor={false}
          unlocked
          photoKind="cycle-world-entry-photo"
        />
      ) : (
        <WorldBible
          scope="story"
          recordId={story.id}
          tables={[{
            id: "primary",
            title: "Сеттинг",
            model: "Story",
            recordId: story.id,
            values: grapesOf(story),
            suggestions: {},
            titleField: null,
          }]}
          entries={storyWorldEntries}
          fantasyGeneral={story.fantasyGeneral}
          fantasyNotes={story.fantasyNotes}
          canEdit
          allowTables={false}
          isMentor={false}
          unlocked
          photoKind="story-world-entry-photo"
        />
      )}
    </div>
  );
}
