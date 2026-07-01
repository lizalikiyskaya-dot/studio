"use client";

import { useState, useTransition } from "react";
import type { Story } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { toggleStorySettingChip } from "./actions";

const CHIPS = ["Магнит", "Манифест", "Фильтр"];

export default function StorySettingTypeSection({ story }: { story: Story }) {
  const [photoUrl, setPhotoUrl] = useState(story.settingPhotoUrl);
  const [chips, setChips] = useState<string[]>(story.settingChips);
  const [, startTransition] = useTransition();

  function handleChipClick(chip: string) {
    const optimistic = chips.includes(chip) ? chips.filter((c) => c !== chip) : [...chips, chip];
    setChips(optimistic);
    startTransition(() => { void toggleStorySettingChip(story.id, chip); });
  }

  return (
    <div>
      <ImageUploadBox
        value={photoUrl}
        onUpload={(file) => {
          setPhotoUrl(URL.createObjectURL(file));
          startTransition(() => { void uploadFile("story-setting-photo", story.id, "settingPhotoUrl", file); });
        }}
        onDelete={() => {
          setPhotoUrl(null);
          startTransition(() => { void deletePhoto("story-setting-photo", story.id, "settingPhotoUrl"); });
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
                border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                background: selected ? "var(--accent)" : "transparent",
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
