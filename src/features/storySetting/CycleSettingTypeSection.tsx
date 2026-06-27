"use client";

import { useState, useTransition } from "react";
import type { Cycle } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { toggleCycleSettingChip } from "./actions";

const CHIPS = ["Магнит", "Манифест", "Фильтр"];

export default function CycleSettingTypeSection({ cycleId, cycle }: { cycleId: string; cycle: Cycle }) {
  const [photoUrl, setPhotoUrl] = useState(cycle.settingPhotoUrl);
  const [chips, setChips] = useState<string[]>(cycle.settingChips);
  const [, startTransition] = useTransition();

  function handleChipClick(chip: string) {
    const optimistic = chips.includes(chip) ? chips.filter((c) => c !== chip) : [...chips, chip];
    setChips(optimistic);
    startTransition(() => {
      toggleCycleSettingChip(cycleId, chip);
    });
  }

  return (
    <div>
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
        className="w-full max-w-[420px] h-[170px] rounded-md mb-5"
      />

      <div className="flex gap-2.5 flex-wrap">
        {CHIPS.map((chip) => {
          const selected = chips.includes(chip);
          return (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className="font-mono-label text-[12px] px-4 py-2 rounded-full"
              style={{
                border: `1px solid ${selected ? "var(--wine)" : "var(--rule)"}`,
                background: selected ? "var(--wine)" : "transparent",
                color: selected ? "#fff" : "var(--ink-soft)",
              }}
            >
              {chip}
            </button>
          );
        })}
      </div>
    </div>
  );
}
