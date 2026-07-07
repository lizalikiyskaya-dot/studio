"use client";

import type { Story, CycleWorldEntry, StoryWorldEntry } from "@/generated/prisma/client";
import Subtabs from "@/components/Subtabs";
import SettingTypeMap from "@/components/SettingTypeMap";
import StoryGrapesTable from "./StoryGrapesTable";
import StorySettingTypeSection from "./StorySettingTypeSection";
import StoryFantasySection from "./StoryFantasySection";

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

const GRAPES_LABELS: [Exclude<keyof CycleSettingSnap, "settingMapX" | "settingMapY">, string, string][] = [
  ["grapesGeography", "G", "География"],
  ["grapesReligion", "R", "Религия / верования"],
  ["grapesAchievements", "A", "Достижения"],
  ["grapesPolitics", "P", "Политика"],
  ["grapesEconomy", "E", "Экономика"],
  ["grapesSocial", "S", "Соц. структура"],
];

function SharedGrapes({ cycle }: { cycle: CycleSettingSnap }) {
  return (
    <div>
      <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-faint)" }}>
        Используется GRAPES цикла (только чтение).
      </p>
      {GRAPES_LABELS.map(([field, letter, label]) => (
        <div key={field} className="flex gap-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="heading w-[180px] flex-shrink-0 font-semibold text-[15px] pr-4 border-r" style={{ color: "var(--accent)", borderColor: "var(--border)" }}>
            <span className="font-bold mr-2" style={{ color: "var(--ink)" }}>{letter}</span>
            {label}
          </div>
          <p className="flex-1 text-[13.5px] leading-snug py-0.5" style={{ color: cycle[field] ? "var(--ink)" : "var(--ink-faint)" }}>
            {(cycle[field] as string) || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

function SharedSettingType({ cycle }: { cycle: CycleSettingSnap }) {
  return (
    <div>
      <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-faint)" }}>
        Используется тип сеттинга цикла (только чтение).
      </p>
      {cycle.settingPhotoUrl && (
        <div
          className="w-full max-w-[420px] h-[170px] rounded-md mb-5 bg-cover bg-center"
          style={{ backgroundImage: `url(${cycle.settingPhotoUrl})`, border: "1px solid var(--border)" }}
        />
      )}
      <SettingTypeMap x={cycle.settingMapX} y={cycle.settingMapY} readOnly />
    </div>
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
  const isShared = story.settingSource === "SHARED" && !!story.cycleId;

  const tabs = [
    {
      label: "Метод GRAPES",
      content: isShared && cycleSetting
        ? <SharedGrapes cycle={cycleSetting} />
        : <StoryGrapesTable story={story} />,
    },
    {
      label: "Тип сеттинга",
      content: isShared && cycleSetting
        ? <SharedSettingType cycle={cycleSetting} />
        : <StorySettingTypeSection story={story} />,
    },
    {
      label: "Фэнтези мир",
      content: isShared
        ? (
          <div>
            <p className="text-[12.5px] mb-3" style={{ color: "var(--ink-faint)" }}>
              Используется фэнтези мир цикла (только чтение).
            </p>
            <div className="flex flex-wrap gap-2.5">
              {cycleWorldEntries.length === 0 && (
                <span className="text-[13px]" style={{ color: "var(--ink-faint)" }}>
                  В цикле пока нет записей сеттинга.
                </span>
              )}
              {cycleWorldEntries.map((e) => (
                <span key={e.id} className="text-[13px] px-3 py-1.5 rounded-sm" style={{ border: "1px solid var(--border)" }}>
                  {e.title}
                </span>
              ))}
            </div>
          </div>
        )
        : (
          <StoryFantasySection story={story} storyId={story.id} initialEntries={storyWorldEntries} />
        ),
    },
  ];

  return <Subtabs tabs={tabs} />;
}
