"use client";

import type { Story, CycleWorldEntry, StoryWorldEntry } from "@/generated/prisma/client";
import StorySettingTypeSection from "./StorySettingTypeSection";
import SettingMixPanel from "@/features/setting/SettingMixPanel";
import SettingPhotoBanner from "@/features/setting/SettingPhotoBanner";
import WorldBible from "@/features/setting/WorldBible";
import { GRAPES_FIELDS, type GrapesBag } from "@/features/setting/worldBible";
import { resolveShares } from "@/features/setting/settingMix";

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
    <div className="setting-stage">
      <div className="setting-top">
      {shared ? (
        <SettingPhotoBanner recordId={story.cycleId ?? story.id} photoUrl={shared.settingPhotoUrl} canEdit={false} kind="cycle-setting-photo" />
      ) : (
        <SettingPhotoBanner recordId={story.id} photoUrl={story.settingPhotoUrl} canEdit kind="story-setting-photo" />
      )}
        <div className="setting-stage-side">
          {shared ? (
            <SettingMixPanel readOnly initial={resolveShares({
              settingManifest: shared.settingManifest ?? null,
              settingFilter: shared.settingFilter ?? null,
              settingConflict: shared.settingConflict ?? null,
              settingMagnet: shared.settingMagnet ?? null,
              settingMapX: shared.settingMapX,
              settingMapY: shared.settingMapY,
            })} />
          ) : (
            <StorySettingTypeSection story={story} />
          )}
        </div>
      </div>
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
              photoKind="story-world-entry-photo"
            />
          )}
    </div>
  );
}
