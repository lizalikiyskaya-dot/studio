"use client";

import { useState, useTransition } from "react";
import type { Cycle } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import SettingMixPanel from "@/features/setting/SettingMixPanel";
import { resolveShares } from "@/features/setting/settingMix";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
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
  const [photoUrl, setPhotoUrl] = useState(cycle.settingPhotoUrl);
  const [, startTransition] = useTransition();

  return (
    <section className="rounded-[24px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <h2 className="text-[17px] font-semibold">Тип сеттинга</h2>
      <div className="mt-3">
        <SettingMixPanel
          initial={resolveShares(cycle)}
          suggestion={suggestion}
          actions={{
            save: (shares) => saveCycleSettingMix(cycleId, shares),
            accept: () => acceptCycleSettingMix(cycleId),
            reject: () => rejectCycleSettingMix(cycleId),
          }}
        />
      </div>
      <ImageUploadBox
        value={photoUrl}
        onUpload={(file) => {
          setPhotoUrl(URL.createObjectURL(file));
          startTransition(() => { void uploadFile("cycle-setting-photo", cycleId, "settingPhotoUrl", file); });
        }}
        onDelete={() => {
          setPhotoUrl(null);
          startTransition(() => { void deletePhoto("cycle-setting-photo", cycleId, "settingPhotoUrl"); });
        }}
        placeholder="фото настроения"
        className="mt-4 h-[220px] w-full rounded-[14px]"
      />
    </section>
  );
}
