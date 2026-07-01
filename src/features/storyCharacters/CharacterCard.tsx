"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import type { ArcType } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { ARC_GROUPS, type CharacterFieldKey } from "@/features/characters/fields";
import { CHARACTER_DEFAULTS } from "@/lib/characterDefaults";
import { Button } from "@/components/ui/Button";

const ARC_TYPE_INDEX: Record<ArcType, number> = {
  POSITIVE: 0,
  DISILLUSIONMENT: 1,
  FALL: 2,
  CORRUPTION: 3,
  FLAT: 4,
};
const ARC_TYPE_LABEL: Record<ArcType, string> = {
  POSITIVE: "Позитивная арка",
  DISILLUSIONMENT: "Арка разочарования",
  FALL: "Арка падения",
  CORRUPTION: "Арка порчи",
  FLAT: "Плоская арка",
};
const ARC_TYPE_COLOR: Record<ArcType, { bg: string; fg: string }> = {
  POSITIVE: { bg: "var(--sage-soft)", fg: "var(--sage)" },
  CORRUPTION: { bg: "var(--accent-soft)", fg: "var(--wine)" },
  FLAT: { bg: "#E2E9EE", fg: "#3F6080" },
  DISILLUSIONMENT: { bg: "#E0CBE7", fg: "#6B4F82" },
  FALL: { bg: "#F4DDBC", fg: "#8A6B2E" },
};
const ARC_TYPES: ArcType[] = ["POSITIVE", "DISILLUSIONMENT", "FALL", "CORRUPTION", "FLAT"];

export type CharacterLike = {
  id: string;
  name: string;
  photoUrl: string | null;
  arcType: ArcType | null;
  data: unknown;
};

export default function CharacterCard({
  character,
  uploadTarget,
  onUpdateName,
  onUpdateArcType,
  onUpdateField,
  onUpdatePhotoUrl,
  onDelete,
}: {
  character: CharacterLike;
  uploadTarget: "cycle-character-photo" | "story-character-photo";
  onUpdateName: (id: string, name: string) => void;
  onUpdateArcType: (id: string, arcType: ArcType) => void;
  onUpdateField: (id: string, field: CharacterFieldKey, value: string) => void;
  onUpdatePhotoUrl?: (id: string, url: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(character.photoUrl);
  const [, startTransition] = useTransition();
  const data = (character.data as Record<string, string>) ?? {};

  function handleDelete() {
    if (!window.confirm(`Удалить «${character.name || "без имени"}»?`)) return;
    onDelete(character.id);
  }

  return (
    <div
      className="rounded-md mb-4 overflow-hidden max-w-[760px]"
      style={{ border: "1px solid var(--rule)", background: open ? "#fff" : "#FAFAF9" }}
    >
      <div onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
        <div
          className="rounded-full flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--rule)",
            backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <span className="heading flex-1 font-semibold text-[14.5px]">{character.name || "Без имени"}</span>
        {character.arcType && (
          <span
            className="font-mono-label text-[9.5px] uppercase px-2 py-1 rounded-full"
            style={{ background: ARC_TYPE_COLOR[character.arcType].bg, color: ARC_TYPE_COLOR[character.arcType].fg }}
          >
            {ARC_TYPE_LABEL[character.arcType]}
          </span>
        )}
        <span
          className="flex-shrink-0"
          style={{ color: "var(--faded)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}
        >
          <ChevronDown size={15} />
        </span>
      </div>

      <div className="px-4 pb-5 pt-1 border-t" style={{ borderColor: "var(--rule)", display: open ? "block" : "none" }}>
        <div className="flex gap-5 items-center my-4">
          <ImageUploadBox
            value={photoUrl}
            shape="circle"
            onUpload={(file) => {
              setPhotoUrl(URL.createObjectURL(file));
              startTransition(() => { void uploadFile(uploadTarget, character.id, "photoUrl", file); });
            }}
            onDelete={() => {
              setPhotoUrl(null);
              startTransition(() => { void deletePhoto(uploadTarget, character.id, "photoUrl"); });
            }}
            onSelectUrl={(url) => {
              setPhotoUrl(url);
              onUpdatePhotoUrl?.(character.id, url);
            }}
            defaults={CHARACTER_DEFAULTS}
            placeholder="фото"
            className="rounded-full flex-shrink-0"
            style={{ width: 90, height: 90, minWidth: 90 }}
          />
          <div className="flex-1 min-w-0">
            <label className="block text-[12.5px] mb-1.5" style={{ color: "var(--faded)" }}>
              Имя
            </label>
            <input
              defaultValue={character.name}
              onBlur={(e) => onUpdateName(character.id, e.target.value)}
              className="heading font-semibold text-[18px] outline-none bg-transparent border-b w-full py-1"
              style={{ borderColor: "var(--rule)" }}
            />
          </div>
          <Button onClick={handleDelete} variant="secondary" size="sm" pill className="flex-shrink-0">
            удалить
          </Button>
        </div>

        <p className="text-[12.5px] mb-3" style={{ color: "var(--faded)" }}>
          Выберите тип арки — она подсветится цветом, и можно заполнять.
        </p>
        <div className="flex gap-2.5 mb-5 flex-wrap">
          {ARC_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onUpdateArcType(character.id, type)}
              className="text-[12.5px] px-3.5 py-1.5 rounded-full"
              style={{
                border: `1px solid ${character.arcType === type ? ARC_TYPE_COLOR[type].bg : "var(--rule)"}`,
                background: character.arcType === type ? ARC_TYPE_COLOR[type].bg : "transparent",
                color: character.arcType === type ? ARC_TYPE_COLOR[type].fg : "var(--ink-soft)",
              }}
            >
              {ARC_TYPE_LABEL[type]}
            </button>
          ))}
        </div>

        {character.arcType ? (
          <div>
            {ARC_GROUPS[ARC_TYPE_INDEX[character.arcType]].fields.map((f) => (
              <div key={f.key} className="mb-4">
                {f.label && (
                  <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
                    {f.label}
                  </label>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="font-mono-label text-[9px] mb-0.5" style={{ color: "var(--wine)" }}>
                      тезис
                    </div>
                    <AutoGrowTextarea
                      defaultValue={data[f.key] ?? ""}
                      onBlur={(value) => onUpdateField(character.id, f.key, value)}
                      className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
                      style={{ borderColor: "var(--rule)" }}
                    />
                  </div>
                  {f.sceneKey && (
                    <div>
                      <div className="font-mono-label text-[9px] mb-0.5" style={{ color: "var(--sage)" }}>
                        сцена
                      </div>
                      <AutoGrowTextarea
                        defaultValue={data[f.sceneKey] ?? ""}
                        onBlur={(value) => onUpdateField(character.id, f.sceneKey!, value)}
                        placeholder="в какой сцене и как это проявляется"
                        className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
                        style={{ borderColor: "var(--rule)" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px]" style={{ color: "var(--faded)" }}>
            Сначала выберите тип арки выше.
          </p>
        )}
      </div>
    </div>
  );
}
