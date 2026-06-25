"use client";

import Accordion from "@/components/Accordion";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import ImageUploadBox from "@/components/ImageUploadBox";
import SuggestableField from "@/features/suggestions/SuggestableField";
import type { SuggestableModel } from "@/lib/suggestionRegistry";
import { blurOnEnter } from "@/lib/blurOnEnter";
import type { FieldGroup } from "./fields";

type Suggestable = { model: SuggestableModel; recordId: string };

function FieldBlock({
  label,
  value,
  onBlur,
  readOnly,
  suggestable,
  fieldKey,
  suggestion,
}: {
  label?: string;
  value: string;
  onBlur: (v: string) => void;
  readOnly?: boolean;
  suggestable?: Suggestable;
  fieldKey: string;
  suggestion?: string;
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
          {label}
        </label>
      )}
      {readOnly ? (
        <p className="text-[13.5px] leading-relaxed pb-1 border-b" style={{ borderColor: "var(--rule)" }}>
          {value || <span style={{ color: "var(--faded)" }}>—</span>}
        </p>
      ) : suggestable ? (
        <SuggestableField
          model={suggestable.model}
          recordId={suggestable.recordId}
          field={fieldKey}
          value={value}
          suggestion={suggestion}
          className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
          style={{ borderColor: "var(--rule)" }}
        />
      ) : (
        <AutoGrowTextarea
          defaultValue={value}
          onBlur={onBlur}
          className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
          style={{ borderColor: "var(--rule)" }}
        />
      )}
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
  readOnly,
  suggestable,
  nameSuggestion,
  fieldSuggestions,
}: {
  name: string;
  photoUrl: string | null;
  data: Record<string, string>;
  groups: FieldGroup[];
  onNameBlur: (value: string) => void;
  onFieldBlur: (field: string, value: string) => void;
  onPhotoUpload: (file: File) => void;
  onDelete: () => void;
  readOnly?: boolean;
  suggestable?: Suggestable;
  nameSuggestion?: string;
  fieldSuggestions?: Record<string, string>;
}) {
  function handleDelete() {
    if (!window.confirm(`Удалить «${name || "без имени"}»?`)) return;
    onDelete();
  }

  return (
    <div>
      <div className="flex gap-5 items-center mb-6">
        {readOnly ? (
          <div
            className="rounded-sm flex-shrink-0"
            style={{
              width: 90,
              height: 90,
              border: "1px solid var(--rule)",
              backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <ImageUploadBox
            value={photoUrl}
            onUpload={onPhotoUpload}
            placeholder="фото"
            className="rounded-sm flex-shrink-0"
            style={{ width: 90, height: 90, minWidth: 90 }}
          />
        )}
        <div className="flex-1 min-w-0">
          <label className="block text-[12.5px] mb-1.5" style={{ color: "var(--faded)" }}>
            Имя
          </label>
          {readOnly ? (
            <p className="heading font-semibold text-[18px] pb-1">{name}</p>
          ) : suggestable ? (
            <SuggestableField
              model={suggestable.model}
              recordId={suggestable.recordId}
              field="name"
              value={name}
              suggestion={nameSuggestion}
              as="input"
              className="heading font-semibold text-[18px] outline-none bg-transparent border-b w-full py-1"
              style={{ borderColor: "var(--rule)" }}
            />
          ) : (
            <input
              defaultValue={name}
              onBlur={(e) => onNameBlur(e.target.value)}
              onKeyDown={blurOnEnter}
              className="heading font-semibold text-[18px] outline-none bg-transparent border-b w-full py-1"
              style={{ borderColor: "var(--rule)" }}
            />
          )}
        </div>
        {!readOnly && (
          <button
            onClick={handleDelete}
            className="text-[12.5px] px-2.5 py-1.5 rounded-sm flex-shrink-0"
            style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
          >
            Удалить
          </button>
        )}
      </div>

      {groups.map((group, i) => {
        if (!group.title) {
          return (
            <div key={i} className="mb-5">
              <div className="text-[13px] font-medium mb-2" style={{ color: "var(--wine)" }}>
                {group.subhead}
              </div>
              {group.fields.map((f) => (
                <FieldBlock
                  key={f.key}
                  value={data[f.key] ?? ""}
                  onBlur={(v) => onFieldBlur(f.key, v)}
                  readOnly={readOnly}
                  suggestable={suggestable}
                  fieldKey={f.key}
                  suggestion={fieldSuggestions?.[f.key]}
                />
              ))}
            </div>
          );
        }
        return (
          <Accordion key={i} title={group.title} defaultOpen={group.defaultOpen}>
            {group.subhead && (
              <div className="text-[13px] font-medium mb-3" style={{ color: "var(--wine)" }}>
                {group.subhead}
              </div>
            )}
            {group.fields.map((f) => (
              <FieldBlock
                key={f.key}
                label={f.label}
                value={data[f.key] ?? ""}
                onBlur={(v) => onFieldBlur(f.key, v)}
                readOnly={readOnly}
                suggestable={suggestable}
                fieldKey={f.key}
                suggestion={fieldSuggestions?.[f.key]}
              />
            ))}
          </Accordion>
        );
      })}
    </div>
  );
}
