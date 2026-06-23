"use client";

import { useState, useTransition } from "react";
import type { Character, ArcType } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import ImageUploadBox from "@/components/ImageUploadBox";
import { ARC_GROUPS } from "../fields";
import {
  updateCharacterName,
  updateCharacterField,
  updateCharacterPhoto,
  updateCharacterArcType,
  deleteCharacter,
} from "../actions";

const ARC_TYPE_INDEX: Record<ArcType, number> = { POSITIVE: 0, NEGATIVE: 1, FLAT: 2 };
const ARC_TYPE_LABEL: Record<ArcType, string> = {
  POSITIVE: "Позитивная арка",
  NEGATIVE: "Отрицательная арка",
  FLAT: "Плоская арка",
};
const ARC_TYPES: ArcType[] = ["POSITIVE", "NEGATIVE", "FLAT"];

function FieldBlock({
  label,
  value,
  onBlur,
}: {
  label?: string;
  value: string;
  onBlur: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block font-mono-label text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--faded)" }}>
          {label}
        </label>
      )}
      <AutoGrowTextarea
        defaultValue={value}
        onBlur={onBlur}
        className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
        style={{ borderColor: "var(--rule)" }}
      />
    </div>
  );
}

export default function ArcCharacterCard({
  character,
  onDeleted,
}: {
  character: Character;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(character.name);
  const [photoUrl, setPhotoUrl] = useState(character.photoUrl);
  const [arcType, setArcType] = useState(character.arcType);
  const [, startTransition] = useTransition();
  const data = (character.data as Record<string, string>) ?? {};

  function handleDelete() {
    if (!window.confirm(`Удалить «${name || "без имени"}»?`)) return;
    startTransition(() => deleteCharacter(character.id));
    onDeleted(character.id);
  }

  function handleSelectType(type: ArcType) {
    setArcType(type);
    startTransition(() => updateCharacterArcType(character.id, type));
  }

  function handleFieldBlur(field: string, value: string) {
    startTransition(() => updateCharacterField(character.id, field as never, value));
  }

  return (
    <div className="rounded-md mb-4 overflow-hidden max-w-[760px]" style={{ border: "1px solid var(--rule)", background: open ? "#fff" : "#FAFAF9" }}>
      <div onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
        <div
          className="rounded-sm flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--rule)",
            backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <span className="flex-1 font-semibold text-[14.5px]">{name || "Без имени"}</span>
        {arcType && (
          <span className="font-mono-label text-[9.5px] uppercase px-2 py-1 rounded-full" style={{ background: "var(--sage)", color: "#fff" }}>
            {ARC_TYPE_LABEL[arcType]}
          </span>
        )}
        <span
          className="text-[12px] flex-shrink-0"
          style={{ color: "var(--faded)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}
        >
          ▾
        </span>
      </div>

      {open && (
        <div className="px-4 pb-5 pt-1 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="flex gap-5 items-center my-4">
            <ImageUploadBox
              value={photoUrl}
              onUpload={(dataUrl) => {
                setPhotoUrl(dataUrl);
                startTransition(() => updateCharacterPhoto(character.id, dataUrl));
              }}
              placeholder="фото"
              className="rounded-sm flex-shrink-0"
              style={{ width: 90, height: 90, minWidth: 90 }}
            />
            <div className="flex-1 min-w-0">
              <label className="block font-mono-label text-[9px] uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
                Имя
              </label>
              <input
                defaultValue={name}
                onBlur={(e) => {
                  setName(e.target.value);
                  startTransition(() => updateCharacterName(character.id, e.target.value));
                }}
                className="font-semibold text-[18px] outline-none bg-transparent border-b w-full py-1"
                style={{ borderColor: "var(--rule)" }}
              />
            </div>
            <button
              onClick={handleDelete}
              className="font-mono-label text-[10px] px-2.5 py-1.5 rounded-sm flex-shrink-0"
              style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
            >
              Удалить
            </button>
          </div>

          <p className="text-[12.5px] mb-3" style={{ color: "var(--faded)" }}>
            Выберите тип арки — она подсветится зелёным, и можно заполнять.
          </p>
          <div className="flex gap-2.5 mb-5 flex-wrap">
            {ARC_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                className="font-mono-label text-[11px] px-3.5 py-1.5 rounded-sm"
                style={{
                  border: `1px solid ${arcType === type ? "var(--sage)" : "var(--rule)"}`,
                  background: arcType === type ? "var(--sage)" : "transparent",
                  color: arcType === type ? "#fff" : "var(--ink-soft)",
                }}
              >
                {ARC_TYPE_LABEL[type]}
              </button>
            ))}
          </div>

          {arcType ? (
            <div>
              {ARC_GROUPS[ARC_TYPE_INDEX[arcType]].fields.map((f) => (
                <FieldBlock
                  key={f.key}
                  label={f.label}
                  value={data[f.key] ?? ""}
                  onBlur={(v) => handleFieldBlur(f.key, v)}
                />
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--faded)" }}>
              Сначала выберите тип арки выше.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
