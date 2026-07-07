import { prisma } from "@/lib/prisma";
import { resolveActiveCycle } from "@/lib/resolveCycle";
import CycleSwitcher from "./CycleSwitcher";
import NoCycleYet from "./NoCycleYet";
import AboutCycleForm from "./AboutCycleForm";
import Subtabs from "@/components/Subtabs";
import StoriesList from "@/features/stories/StoriesList";
import CycleCharactersView from "@/features/storyCharacters/CycleCharactersView";
import CycleSettingView from "@/features/storySetting/CycleSettingView";

export default async function CyclesView({
  studentId,
  requestedCycleId,
}: {
  studentId: string;
  requestedCycleId?: string;
}) {
  const { cycles, activeCycle } = await resolveActiveCycle(studentId, requestedCycleId);

  if (!activeCycle) {
    return (
      <div>
        <h1 className="page-title text-[24px] font-semibold mb-6">Мастерская рассказов</h1>
        <NoCycleYet studentId={studentId} />
      </div>
    );
  }

  const [stories, cycleCharacters, cycleWorldEntries] = await Promise.all([
    prisma.story.findMany({ where: { cycleId: activeCycle.id }, orderBy: { order: "asc" } }),
    prisma.cycleCharacter.findMany({ where: { cycleId: activeCycle.id }, orderBy: { order: "asc" } }),
    prisma.cycleWorldEntry.findMany({ where: { cycleId: activeCycle.id }, orderBy: { order: "asc" } }),
  ]);

  const storyIds = stories.map((s) => s.id);
  const [storyCharacters, storyWorldEntries] = await Promise.all([
    prisma.storyCharacter.findMany({ where: { storyId: { in: storyIds } }, orderBy: { order: "asc" } }),
    prisma.storyWorldEntry.findMany({ where: { storyId: { in: storyIds } }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <CycleSwitcher studentId={studentId} cycles={cycles} activeCycleId={activeCycle.id} />
      <h1 className="page-title text-[24px] font-semibold mb-6">Мастерская рассказов</h1>

      <Subtabs
        tabs={[
          { label: "О цикле", content: <AboutCycleForm cycle={activeCycle} /> },
          {
            label: "Рассказы",
            content: (
              <StoriesList
                cycleId={activeCycle.id}
                studentId={studentId}
                stories={stories}
                cycleCharacters={cycleCharacters}
                cycleWorldEntries={cycleWorldEntries}
                storyCharacters={storyCharacters}
                storyWorldEntries={storyWorldEntries}
                cycleSetting={{
                  grapesGeography: activeCycle.grapesGeography,
                  grapesReligion: activeCycle.grapesReligion,
                  grapesAchievements: activeCycle.grapesAchievements,
                  grapesPolitics: activeCycle.grapesPolitics,
                  grapesEconomy: activeCycle.grapesEconomy,
                  grapesSocial: activeCycle.grapesSocial,
                  settingPhotoUrl: activeCycle.settingPhotoUrl,
                  settingChips: activeCycle.settingChips,
                  settingMapX: activeCycle.settingMapX,
                  settingMapY: activeCycle.settingMapY,
                }}
              />
            ),
          },
          {
            label: "Персонажи цикла",
            content: <CycleCharactersView cycleId={activeCycle.id} characters={cycleCharacters} />,
          },
          {
            label: "Сеттинг цикла",
            content: <CycleSettingView cycle={activeCycle} />,
          },
        ]}
      />
    </div>
  );
}
