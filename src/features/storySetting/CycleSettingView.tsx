import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Cycle } from "@/generated/prisma/client";
import Subtabs from "@/components/Subtabs";
import CycleGrapesTable from "./CycleGrapesTable";
import CycleSettingTypeSection from "./CycleSettingTypeSection";
import CycleFantasySection from "./CycleFantasySection";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";

export default async function CycleSettingView({ cycle }: { cycle: Cycle }) {
  const suggestions = await getSuggestionsForRecords("Cycle", [cycle.id]);
  const worldEntries = await prisma.cycleWorldEntry.findMany({
    where: { cycleId: cycle.id },
    orderBy: { order: "asc" },
  });
  const session = await getSession();
  const isMentor = session?.role === "MENTOR";

  const tabs = [
    {
      label: "Метод GRAPES",
      content: <CycleGrapesTable cycleId={cycle.id} cycle={cycle} suggestions={suggestions[cycle.id] ?? {}} />,
    },
    {
      label: "Тип сеттинга",
      content: <CycleSettingTypeSection cycleId={cycle.id} cycle={cycle} />,
    },
  ];

  if (isMentor || cycle.fantasyUnlocked) {
    tabs.push({
      label: "Фэнтези мир",
      content: (
        <CycleFantasySection cycleId={cycle.id} cycle={cycle} initialEntries={worldEntries} isMentor={isMentor} />
      ),
    });
  }

  return (
    <div>
      <p className="text-[13px] mb-4" style={{ color: "var(--faded)" }}>
        Этот сеттинг общий для всего цикла — рассказы с источником «общий» подтягивают его автоматически.
      </p>
      <Subtabs tabs={tabs} />
    </div>
  );
}
