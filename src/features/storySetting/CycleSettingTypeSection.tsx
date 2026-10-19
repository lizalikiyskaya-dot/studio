"use client";

import { useState, useTransition } from "react";
import type { Cycle } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import SettingTypeMap from "@/components/SettingTypeMap";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { updateCycleSettingMap } from "./actions";

export default function CycleSettingTypeSection({ cycleId, cycle }: { cycleId: string; cycle: Cycle }) {
  const [photoUrl, setPhotoUrl] = useState(cycle.settingPhotoUrl);
  const [, startTransition] = useTransition();

  return (
    <div>
      <SettingTypeMap
        x={cycle.settingMapX}
        y={cycle.settingMapY}
        onSave={(x, y) => startTransition(() => updateCycleSettingMap(cycleId, x, y))}
      />
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
        placeholder="нажмите, чтобы добавить фото настроения"
        className="mt-5 h-[220px] w-full rounded-[14px]"
      />
    </div>
  );
}
