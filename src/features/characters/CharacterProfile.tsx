"use client";

import Accordion from "@/components/Accordion";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import ImageUploadBox from "@/components/ImageUploadBox";
import type { FieldGroup } from "./fields";

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

export default function CharacterProfile({
  name,
  photoUrl,
  data,
  groups,
  onNameBlur,
  onFieldBlur,
  onPhotoUpload,
  onDelete,
}: {
  name: string;
  photoUrl: string | null;
  data: Record<string, string>;
  groups: FieldGroup[];
  onNameBlur: (value: string) => void;
  onFieldBlur: (field: string, value: string) => void;
  onPhotoUpload: (dataUrl: string) => void;
  onDelete: () => void;
}) {
  function handleDelete() {
    if (!window.confirm(`Удалить «${name || "без имени"}»?`)) return;
    onDelete();
  }

  return (
    <div className="rounded-md p-5 mb-6 max-w-[760px]" style={{ border: "1px solid var(--rule)" }}>
      <div className="flex gap-5 items-center mb-6">
        <ImageUploadBox
          value={photoUrl}
          onUpload={onPhotoUpload}
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
            onBlur={(e) => onNameBlur(e.target.value)}
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

      {groups.map((group, i) => {
        if (!group.title) {
          return (
            <div key={i} className="mb-5">
              <div className="font-mono-label text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--wine)" }}>
                {group.subhead}
              </div>
              {group.fields.map((f) => (
                <FieldBlock
                  key={f.key}
                  value={data[f.key] ?? ""}
                  onBlur={(v) => onFieldBlur(f.key, v)}
                />
              ))}
            </div>
          );
        }
        return (
          <Accordion key={i} title={group.title} defaultOpen={group.defaultOpen}>
            {group.subhead && (
              <div className="font-mono-label text-[10px] uppercase tracking-wide mb-3" style={{ color: "var(--wine)" }}>
                {group.subhead}
              </div>
            )}
            {group.fields.map((f) => (
              <FieldBlock
                key={f.key}
                label={f.label}
                value={data[f.key] ?? ""}
                onBlur={(v) => onFieldBlur(f.key, v)}
              />
            ))}
          </Accordion>
        );
      })}
    </div>
  );
}
