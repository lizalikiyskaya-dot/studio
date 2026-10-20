"use client";

import type { Cycle } from "@/generated/prisma/client";
import SettingMixPanel from "@/features/setting/SettingMixPanel";
import { resolveShares } from "@/features/setting/settingMix";
import { acceptCycleSettingMix, rejectCycleSettingMix, saveCycleSettingMix } from "./actions";

export default function CycleSettingTypeSection({
  cycleId,
  cycle,
  suggestion,
}: {
  cycleId: string;
  cycle: Cycle;
  suggestion?: string | null;
}) {
  return (
    <SettingMixPanel
      initial={resolveShares(cycle)}
      suggestion={suggestion}
      actions={{
        save: (shares) => saveCycleSettingMix(cycleId, shares),
        accept: () => acceptCycleSettingMix(cycleId),
        reject: () => rejectCycleSettingMix(cycleId),
      }}
    />
  );
}
