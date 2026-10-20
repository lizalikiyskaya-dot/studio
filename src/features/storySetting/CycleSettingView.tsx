import { prisma } from "@/lib/prisma";
import type { Cycle } from "@/generated/prisma/client";
import CycleSettingTypeSection from "./CycleSettingTypeSection";
import SettingPhotoBanner from "@/features/setting/SettingPhotoBanner";
import WorldBible from "@/features/setting/WorldBible";
import { GRAPES_FIELDS, type GrapesBag } from "@/features/setting/worldBible";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";

export default async function CycleSettingView({ cycle }: { cycle: Cycle }) {
  const suggestions = await getSuggestionsForRecords("Cycle", [cycle.id]);
  const cycleSuggestions = suggestions[cycle.id] ?? {};
  const worldEntries = await prisma.cycleWorldEntry.findMany({
    where: { cycleId: cycle.id },
    orderBy: { order: "asc" },
  });
  const grapes = {} as GrapesBag;
  for (const field of GRAPES_FIELDS) grapes[field] = cycle[field] ?? "";

  return (
    <div className="setting-stage">
      <div className="setting-top">
      <SettingPhotoBanner recordId={cycle.id} photoUrl={cycle.settingPhotoUrl} canEdit kind="cycle-setting-photo" />
      <div className="setting-stage-side">
        <CycleSettingTypeSection cycleId={cycle.id} cycle={cycle} suggestion={cycleSuggestions.settingMix} />
      </div>
      </div>
      <WorldBible
        scope="cycle"
        recordId={cycle.id}
        tables={[{
          id: "primary",
          title: "Сеттинг",
          model: "Cycle",
          recordId: cycle.id,
          values: grapes,
          suggestions: cycleSuggestions,
          titleField: null,
        }]}
        entries={worldEntries}
        fantasyGeneral={cycle.fantasyGeneral}
        fantasyNotes={cycle.fantasyNotes}
        fantasySuggestions={cycleSuggestions}
        canEdit
        allowTables={false}
        photoKind="cycle-world-entry-photo"
      />
    </div>
  );
}
