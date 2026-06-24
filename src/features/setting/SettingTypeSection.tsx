"use client";

import { useState, useTransition } from "react";
import type { Book } from "@/generated/prisma/client";
import { updateSettingPhoto, toggleSettingChip } from "./actions";

const CHIPS = ["Магнит", "Манифест", "Фильтр"];

export default function SettingTypeSection({ bookId, book }: { bookId: string; book: Book }) {
  const [photoUrl, setPhotoUrl] = useState(book.settingPhotoUrl ?? "");
  const [chips, setChips] = useState<string[]>(book.settingChips);
  const [, startTransition] = useTransition();

  function handlePhotoClick() {
    const url = window.prompt("Ссылка на фото настроения");
    if (!url) return;
    setPhotoUrl(url);
    startTransition(() => updateSettingPhoto(bookId, url));
  }

  function handleChipClick(chip: string) {
    const optimistic = chips.includes(chip)
      ? chips.filter((c) => c !== chip)
      : [...chips, chip];
    setChips(optimistic);
    startTransition(() => {
      toggleSettingChip(bookId, chip);
    });
  }

  return (
    <div>
      <div
        onClick={handlePhotoClick}
        className="w-full max-w-[420px] h-[170px] rounded-md flex items-center justify-center cursor-pointer mb-5 text-center"
        style={{
          border: "1px dashed var(--rule)",
          color: "var(--faded)",
          backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {!photoUrl && <span className="text-[12.5px]">нажмите, чтобы добавить фото настроения</span>}
      </div>

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
