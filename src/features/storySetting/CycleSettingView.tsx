import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Cycle } from "@/generated/prisma/client";
import CycleGrapesTable from "./CycleGrapesTable";
import CycleSettingTypeSection from "./CycleSettingTypeSection";
import CycleFantasySection from "./CycleFantasySection";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { GrapesSection } from "@/components/GrapesLetterCard";

export default async function CycleSettingView({ cycle }: { cycle: Cycle }) {
  const suggestions = await getSuggestionsForRecords("Cycle", [cycle.id]);
  const cycleSuggestions = suggestions[cycle.id] ?? {};
  const worldEntries = await prisma.cycleWorldEntry.findMany({
    where: { cycleId: cycle.id },
    orderBy: { order: "asc" },
  });
  const session = await getSession();
  const isMentor = session?.role === "MENTOR";
  const showFantasy = isMentor || cycle.fantasyUnlocked;

  return (
    <div>
      <GrapesSection>
        <div className="mt-2.5">
          <CycleGrapesTable cycleId={cycle.id} cycle={cycle} suggestions={cycleSuggestions} />
        </div>
      </GrapesSection>
      <div className={`mt-4 grid grid-cols-1 gap-4 ${showFantasy ? "xl:grid-cols-[1.25fr_1fr]" : ""}`}>
        <CycleSettingTypeSection cycleId={cycle.id} cycle={cycle} suggestion={cycleSuggestions.settingMix} />
        {showFantasy && (
          <CycleFantasySection
            cycleId={cycle.id}
            cycle={cycle}
            initialEntries={worldEntries}
            isMentor={isMentor}
          />
        )}
      </div>
    </div>
  );
}
