"use client";

import { useState, useTransition } from "react";
import type { PopArcCharacter, ArcType, Comment } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { ARC_GROUPS } from "@/features/characters/fields";
import { updatePopArcPhoto, updatePopArcType } from "./actions";

const ARC_TYPE_INDEX: Record<ArcType, number> = { POSITIVE: 0, NEGATIVE: 1, FLAT: 2 };
const ARC_TYPE_LABEL: Record<ArcType, string> = {
  POSITIVE: "Позитивная арка",
  NEGATIVE: "Отрицательная арка",
  FLAT: "Плоская арка",
};
const ARC_TYPE_COLOR: Record<ArcType, string> = {
  POSITIVE: "var(--sage)",
  NEGATIVE: "#D9779A",
  FLAT: "#6FA8C9",
};
const ARC_TYPES: ArcType[] = ["POSITIVE", "NEGATIVE", "FLAT"];

function FieldColumn({
  caption,
  captionColor,
  value,
  suggestion,
  recordId,
  fieldKey,
  readOnly,
  placeholder,
}: {
  caption: string;
  captionColor: string;
  value: string;
  suggestion?: string;
  recordId: string;
  fieldKey: string;
  readOnly: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="font-mono-label text-[9px] mb-0.5" style={{ color: captionColor }}>
        {caption}
      </div>
      {readOnly ? (
        <p className="text-[13.5px] leading-relaxed pb-1 border-b" style={{ borderColor: "var(--rule)" }}>
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
          className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
          style={{ borderColor: "var(--rule)" }}
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
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <FieldColumn
          caption="тезис"
          captionColor="var(--wine)"
          value={value}
          suggestion={suggestion}
          recordId={recordId}
          fieldKey={fieldKey}
          readOnly={readOnly}
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
}: {
  character: PopArcCharacter;
  readOnly: boolean;
  suggestions: Record<string, string>;
  initialComments: Comment[];
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(character.photoUrl);
  const [arcType, setArcType] = useState(character.arcType);
  const [, startTransition] = useTransition();
  const data = (character.data as Record<string, string>) ?? {};

  function handleDelete() {
    if (!window.confirm(`Удалить «${character.name || "без имени"}»?`)) return;
    onDelete();
  }

  function handleSelectType(type: ArcType) {
    setArcType(type);
    startTransition(() => updatePopArcType(character.id, type));
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
        <span className="heading flex-1 font-semibold text-[14.5px]">{character.name || "Без имени"}</span>
        {arcType && (
          <span
            className="font-mono-label text-[9.5px] uppercase px-2 py-1 rounded-full"
            style={{ background: ARC_TYPE_COLOR[arcType], color: "#fff" }}
          >
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
                onUpload={(dataUrl) => {
                  setPhotoUrl(dataUrl);
                  startTransition(() => updatePopArcPhoto(character.id, dataUrl));
                }}
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
                <p className="heading font-semibold text-[18px] pb-1">{character.name}</p>
              ) : (
                <SuggestableField
                  model="PopArcCharacter"
                  recordId={character.id}
                  field="name"
                  value={character.name}
                  suggestion={suggestions.name}
                  as="input"
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

          <p className="text-[12.5px] mb-3" style={{ color: "var(--faded)" }}>
            Выберите тип арки — она подсветится цветом, и можно заполнять.
          </p>
          <div className="flex gap-2.5 mb-5 flex-wrap">
            {ARC_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => !readOnly && handleSelectType(type)}
                disabled={readOnly}
                className="text-[12.5px] px-3.5 py-1.5 rounded-sm"
                style={{
                  border: `1px solid ${arcType === type ? ARC_TYPE_COLOR[type] : "var(--rule)"}`,
                  background: arcType === type ? ARC_TYPE_COLOR[type] : "transparent",
                  color: arcType === type ? "#fff" : "var(--ink-soft)",
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
      )}
    </div>
  );
}
