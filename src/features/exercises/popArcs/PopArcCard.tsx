"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import type { PopArcCharacter, ArcType, Comment } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import CardSaveButton from "@/components/CardSaveButton";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { ARC_GROUPS } from "@/features/characters/fields";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { updatePopArcType } from "./actions";
import { Button } from "@/components/ui/Button";
import { CardTitle } from "@/components/InlineTitle";

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
  CORRUPTION: { bg: "var(--accent-soft)", fg: "var(--link)" },
  FLAT: { bg: "#E2E9EE", fg: "#3F6080" },
  DISILLUSIONMENT: { bg: "#E0CBE7", fg: "#6B4F82" },
  FALL: { bg: "#F4DDBC", fg: "#8A6B2E" },
};
const ARC_TYPES: ArcType[] = ["POSITIVE", "DISILLUSIONMENT", "FALL", "CORRUPTION", "FLAT"];

function FieldColumn({
  caption,
  captionColor,
  value,
  suggestion,
  recordId,
  fieldKey,
  readOnly,
  placeholder,
  onSaved,
}: {
  caption: string;
  captionColor: string;
  value: string;
  suggestion?: string;
  recordId: string;
  fieldKey: string;
  readOnly: boolean;
  placeholder?: string;
  onSaved: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[12.5px]" style={{ color: captionColor }}>
        {caption}
      </div>
      {readOnly ? (
        <p className="field-literary rounded-[14px] px-3.5 py-2.5 text-[15.5px] leading-relaxed" style={{ border: "1px solid var(--border)", background: "#fff", minHeight: 72 }}>
          {value || <span style={{ color: "var(--faded)" }}>—</span>}
        </p>
      ) : (
        <SuggestableField
          model="PopArcCharacter"
          recordId={recordId}
          field={fieldKey}
          value={value}
          suggestion={suggestion}
          placeholder={placeholder}
          onSaved={onSaved}
          className="fld field-literary w-full !h-auto text-[15.5px] leading-relaxed"
          style={{ minHeight: 72 }}
        />
      )}
    </div>
  );
}

function FieldBlock({
  label,
  value,
  suggestion,
  recordId,
  fieldKey,
  sceneValue,
  sceneSuggestion,
  sceneFieldKey,
  readOnly,
  onFieldSaved,
}: {
  label?: string;
  value: string;
  suggestion?: string;
  recordId: string;
  fieldKey: string;
  sceneValue?: string;
  sceneSuggestion?: string;
  sceneFieldKey?: string;
  readOnly: boolean;
  onFieldSaved: (field: string, value: string) => void;
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="mb-1.5 block text-[13px] font-medium" style={{ color: "var(--ink)" }}>
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FieldColumn
          caption="тезис"
          captionColor="var(--link)"
          value={value}
          suggestion={suggestion}
          recordId={recordId}
          fieldKey={fieldKey}
          readOnly={readOnly}
          onSaved={(v) => onFieldSaved(fieldKey, v)}
        />
        {sceneFieldKey && (
          <FieldColumn
            caption="сцена"
            captionColor="var(--sage)"
            value={sceneValue ?? ""}
            suggestion={sceneSuggestion}
            recordId={recordId}
            fieldKey={sceneFieldKey}
            readOnly={readOnly}
            placeholder="в какой сцене и как это проявляется"
            onSaved={(v) => onFieldSaved(sceneFieldKey, v)}
          />
        )}
      </div>
    </div>
  );
}

export default function PopArcCard({
  character,
  readOnly,
  suggestions,
  initialComments,
  onDelete,
  startOpen = false,
}: {
  character: PopArcCharacter;
  readOnly: boolean;
  suggestions: Record<string, string>;
  initialComments: Comment[];
  onDelete: () => void;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [name, setName] = useState(character.name);
  const [photoUrl, setPhotoUrl] = useState(character.photoUrl);
  const [arcType, setArcType] = useState(character.arcType);
  const [data, setData] = useState((character.data as Record<string, string>) ?? {});
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  function handleFieldSaved(field: string, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleDelete() {
    if (!(await siteConfirm(`Удалить «${name || "без имени"}»?`))) return;
    onDelete();
  }

  function handleSelectType(type: ArcType) {
    setArcType(type);
    startTransition(() => updatePopArcType(character.id, type));
  }

  return (
    <div ref={rootRef} className="rounded-[18px] mb-4 max-w-[760px]" style={{ border: "1px solid var(--border)", background: open ? "#fff" : "var(--soft)" }}>
      <div onClick={() => setOpen((v) => !v)} className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5">
        <div
          className="rounded-full flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--border)",
            backgroundColor: "var(--soft)",
            backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {readOnly ? (
          <span className="heading flex-1 font-semibold text-[14.5px]">{name || "Без имени"}</span>
        ) : (
          <CardTitle
            value={name}
            autoFocus={startOpen}
            placeholder="Имя"
            model="PopArcCharacter"
            recordId={character.id}
            suggestion={suggestions.name}
            onSave={setName}
            className="min-w-0 flex-1 text-[14.5px]"
          />
        )}
        {arcType && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-medium"
            style={{ background: ARC_TYPE_COLOR[arcType].bg, color: ARC_TYPE_COLOR[arcType].fg }}
          >
            {ARC_TYPE_LABEL[arcType]}
          </span>
        )}
        <span
          className="flex-shrink-0"
          style={{ color: "var(--faded)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}
        >
          <ChevronDown size={15} />
        </span>
      </div>

      <div
        className="px-4 pb-5 pt-1 border-t"
        style={{ borderColor: "var(--border)", display: open ? "block" : "none" }}
      >
          <div className="my-4 flex flex-wrap items-center gap-4">
            {readOnly ? (
              <div
                className="rounded-full flex-shrink-0"
                style={{
                  width: 90,
                  height: 90,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--soft)",
                  backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ) : (
              <ImageUploadBox
                value={photoUrl}
                shape="circle"
                onUpload={(file) => {
                  setPhotoUrl(URL.createObjectURL(file));
                  startTransition(() => { void uploadFile("popArc-photo", character.id, "photoUrl", file); });
                }}
                onDelete={() => {
                  setPhotoUrl(null);
                  startTransition(() => { void deletePhoto("popArc-photo", character.id, "photoUrl"); });
                }}
                placeholder="фото"
                className="rounded-full flex-shrink-0"
                style={{ width: 90, height: 90, minWidth: 90 }}
              />
            )}
            {!readOnly && (
              <div className="flex gap-1.5 flex-shrink-0">
                <CardSaveButton scopeRef={rootRef} />
                <Button onClick={handleDelete} variant="secondary" size="sm" pill>
                  удалить
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 mb-5 flex-wrap">
            {ARC_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => !readOnly && handleSelectType(type)}
                disabled={readOnly}
                className="rounded-full px-3.5 py-1.5 text-[13px] font-medium"
                style={{
                  border: `1px solid ${arcType === type ? ARC_TYPE_COLOR[type].bg : "var(--border)"}`,
                  background: arcType === type ? ARC_TYPE_COLOR[type].bg : "#fff",
                  color: arcType === type ? ARC_TYPE_COLOR[type].fg : "var(--ink)",
                  cursor: readOnly ? "default" : "pointer",
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
                  suggestion={suggestions[f.key]}
                  recordId={character.id}
                  fieldKey={f.key}
                  sceneValue={f.sceneKey ? data[f.sceneKey] ?? "" : undefined}
                  sceneSuggestion={f.sceneKey ? suggestions[f.sceneKey] : undefined}
                  sceneFieldKey={f.sceneKey}
                  readOnly={readOnly}
                  onFieldSaved={handleFieldSaved}
                />
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--faded)" }}>
              {readOnly ? "Тип арки пока не выбран." : "Сначала выберите тип арки выше."}
            </p>
          )}

          <CommentsBlock model="PopArcCharacter" recordId={character.id} initialComments={initialComments} />
      </div>
    </div>
  );
}
