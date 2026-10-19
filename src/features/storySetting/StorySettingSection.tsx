"use client";

import type { Story, CycleWorldEntry, StoryWorldEntry } from "@/generated/prisma/client";
import StoryGrapesTable from "./StoryGrapesTable";
import StorySettingTypeSection from "./StorySettingTypeSection";
import StoryFantasySection from "./StoryFantasySection";
import { describeShares, resolveShares } from "@/features/setting/settingMix";
import EmptyState from "@/components/EmptyState";

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
};

const GRAPES: { field: keyof CycleSettingSnap; letter: string; label: string }[] = [
  { field: "grapesGeography", letter: "Г", label: "География" },
  { field: "grapesReligion", letter: "Р", label: "Религия / верования" },
  { field: "grapesAchievements", letter: "Д", label: "Достижения" },
  { field: "grapesPolitics", letter: "П", label: "Политика" },
  { field: "grapesEconomy", letter: "Э", label: "Экономика" },
  { field: "grapesSocial", letter: "С", label: "Соц. структура" },
];

function SharedGrapes({ cycle }: { cycle: CycleSettingSnap }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {GRAPES.map(({ field, letter, label }) => (
        <div key={field} className="rounded-[16px] p-3" style={{ background: "var(--soft)" }}>
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
            <span className="grid h-5 w-5 place-items-center rounded-[14px] bg-white text-[11px] font-bold">{letter}</span>
            {label}
          </div>
          <p className="mt-1.5 text-[13px] leading-snug" style={{ color: cycle[field] ? "var(--ink)" : "var(--muted)" }}>
            {(cycle[field] as string) || "Пока пусто"}
          </p>
        </div>
      ))}
    </div>
  );
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

  return (
    <div>
      <h2 className="text-[17px] font-semibold">Метод GRAPES</h2>
      <div className="mt-2.5">
        {isShared && cycleSetting ? <SharedGrapes cycle={cycleSetting} /> : <StoryGrapesTable story={story} />}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
        {isShared && cycleSetting ? (
          <SharedSettingType cycle={cycleSetting} />
        ) : (
          <StorySettingTypeSection story={story} />
        )}
        {isShared ? (
          <section className="rounded-[24px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
            <h2 className="text-[17px] font-semibold">Фэнтези мир</h2>
            <div className="mt-3 flex flex-col gap-2">
              {cycleWorldEntries.length === 0 ? (
                <EmptyState compact cue="Самое время описать мир" detail="Записи сеттинга цикла появятся здесь." />
              ) : cycleWorldEntries.map((entry) => (
                <div key={entry.id} className="rounded-[16px] p-3" style={{ background: "var(--soft)" }}>
                  <div className="text-[14px] font-semibold">{entry.title || "Без названия"}</div>
                  {entry.body ? <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: "var(--ink2)" }}>{entry.body}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <StoryFantasySection story={story} storyId={story.id} initialEntries={storyWorldEntries} />
        )}
      </div>
    </div>
  );
}
