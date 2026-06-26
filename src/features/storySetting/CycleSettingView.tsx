"use client";

import type { CycleWorldEntry } from "@/generated/prisma/client";
import WorldEntryGrid from "./WorldEntryGrid";
import { createCycleWorldEntry, deleteCycleWorldEntry, updateCycleWorldEntryTitle, updateCycleWorldEntryBody } from "./actions";

export default function CycleSettingView({
  cycleId,
  entries,
}: {
  cycleId: string;
  entries: CycleWorldEntry[];
}) {
  return (
    <div>
      <p className="text-[13px] mb-4" style={{ color: "var(--faded)" }}>
        Этот сеттинг общий для всего цикла — рассказы с источником «общий» подтягивают его автоматически.
      </p>
      <WorldEntryGrid
        entries={entries}
        uploadTarget="cycle-world-entry-photo"
        onCreate={(category) => createCycleWorldEntry(cycleId, category)}
        onDelete={deleteCycleWorldEntry}
        onUpdateTitle={updateCycleWorldEntryTitle}
        onUpdateBody={updateCycleWorldEntryBody}
      />
    </div>
  );
}
