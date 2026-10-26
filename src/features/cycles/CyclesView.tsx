import { prisma } from "@/lib/prisma";
import { resolveActiveCycle } from "@/lib/resolveCycle";
import CycleSwitcher from "./CycleSwitcher";
import NoCycleYet from "./NoCycleYet";
import AboutCycleForm from "./AboutCycleForm";
import Subtabs from "@/components/Subtabs";
import StoriesList from "@/features/stories/StoriesList";
import CycleCharactersView from "@/features/storyCharacters/CycleCharactersView";
import CycleSettingView from "@/features/storySetting/CycleSettingView";
import PageHeader from "@/components/PageHeader";
import { formatChars } from "@/features/acts/chapterText";
import { storyCount, storyPercent } from "@/features/stories/storyProgress";

export default async function CyclesView({
  studentId,
  requestedCycleId,
  canReview = false,
}: {
  studentId: string;
  requestedCycleId?: string;
  canReview?: boolean;
}) {
  const { cycles, activeCycle } = await resolveActiveCycle(studentId, requestedCycleId);

  if (!activeCycle) {
    return (
      <div>
        <PageHeader title="Мастерская рассказов" />
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

  const written = stories.reduce((sum, story) => sum + storyCount(story.writtenChars), 0);
  const planned = stories.reduce((sum, story) => sum + storyCount(story.plannedChars), 0);
  const percent = storyPercent(written, planned);

  return (
    <div className="chapter-feed">
      <PageHeader
        title="Мастерская рассказов"
        actions={<CycleSwitcher studentId={studentId} cycles={cycles} activeCycleId={activeCycle.id} inline />}
      />

      <section className="chapter-plaque" aria-label="Сводка по циклу">
        <div className="chapter-plaque-row">
          <div>
            <div className="chapter-plaque-num">{stories.length}</div>
            <div className="chapter-plaque-lbl">рассказов в цикле</div>
          </div>
          <div>
            <div className="chapter-plaque-num">{formatChars(written)}</div>
            <div className="chapter-plaque-lbl">написано знаков</div>
          </div>
          <div className="chapter-plaque-grow">
            <div className="chapter-plaque-num">{percent}%</div>
            <div className="chapter-plaque-lbl">готово</div>
          </div>
        </div>
        <div className="chapter-track" aria-hidden="true">
          <i style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
      </section>

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
                canReview={canReview}
                showSummary={false}
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
                  settingManifest: activeCycle.settingManifest,
                  settingFilter: activeCycle.settingFilter,
                  settingConflict: activeCycle.settingConflict,
                  settingMagnet: activeCycle.settingMagnet,
                  fantasyGeneral: activeCycle.fantasyGeneral,
                  fantasyNotes: activeCycle.fantasyNotes,
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
