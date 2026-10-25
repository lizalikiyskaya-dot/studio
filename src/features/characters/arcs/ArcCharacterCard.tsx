"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import Collapse from "@/components/Collapse";
import type { Character, ArcType, Comment } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import CardSaveButton from "@/components/CardSaveButton";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { ARC_GROUPS } from "../fields";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import {
  updateCharacterArcType,
  deleteCharacter,
} from "../actions";
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

function FieldBlock({
  label,
  value,
  suggestion,
  recordId,
  fieldKey,
  sceneValue,
  sceneSuggestion,
  sceneFieldKey,
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
  onFieldSaved: (field: string, value: string) => void;
}) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="font-mono-label text-[9px] mb-0.5" style={{ color: "var(--link)" }}>
            тезис
          </div>
          <SuggestableField
            model="Character"
            recordId={recordId}
            field={fieldKey}
            value={value}
            suggestion={suggestion}
            onSaved={(v) => onFieldSaved(fieldKey, v)}
            className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
            style={{ borderColor: "var(--rule)" }}
          />
        </div>
        {sceneFieldKey && (
          <div>
            <div className="font-mono-label text-[9px] mb-0.5" style={{ color: "var(--sage)" }}>
              сцена
            </div>
            <SuggestableField
              model="Character"
              recordId={recordId}
              field={sceneFieldKey}
              value={sceneValue ?? ""}
              suggestion={sceneSuggestion}
              placeholder="в какой сцене и как это проявляется"
              onSaved={(v) => onFieldSaved(sceneFieldKey, v)}
              className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
              style={{ borderColor: "var(--rule)" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArcCharacterCard({
  character,
  suggestions,
  initialComments,
  onDeleted,
  startOpen = false,
}: {
  character: Character;
  suggestions: Record<string, string>;
  initialComments: Comment[];
  onDeleted: (id: string) => void;
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
    startTransition(() => deleteCharacter(character.id));
    onDeleted(character.id);
  }

  function handleSelectType(type: ArcType) {
    setArcType(type);
    startTransition(() => updateCharacterArcType(character.id, type));
  }

  return (
    <div ref={rootRef} className="rounded-[18px] mb-4 max-w-[760px]" style={{ border: "1px solid var(--rule)", background: open ? "#fff" : "var(--soft)" }}>
      <div onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer">
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
        <CardTitle
          value={name}
          autoFocus={startOpen}
          placeholder="Имя"
          model="Character"
          recordId={character.id}
          suggestion={suggestions.name}
          onSave={setName}
          className="text-[14.5px]"
        />
        {arcType && (
          <span
            className="font-mono-label text-[9.5px] uppercase px-2 py-1 rounded-full"
            style={{ background: ARC_TYPE_COLOR[arcType].bg, color: ARC_TYPE_COLOR[arcType].fg }}
          >
            {ARC_TYPE_LABEL[arcType]}
          </span>
        )}
        <span className={`chevron-turn${open ? " is-open" : ""}`}>
          <ChevronDown size={15} />
        </span>
      </div>

      <Collapse open={open} className="collapse-body px-4 pb-5 pt-1">
          <div className="flex gap-5 items-center my-4">
            <ImageUploadBox
              value={photoUrl}
              shape="circle"
              onUpload={(file) => {
                setPhotoUrl(URL.createObjectURL(file));
                startTransition(() => { void uploadFile("character-photo", character.id, "photoUrl", file); });
              }}
              onDelete={() => {
                setPhotoUrl(null);
                startTransition(() => { void deletePhoto("character-photo", character.id, "photoUrl"); });
              }}
              placeholder="фото"
              className="rounded-full flex-shrink-0"
              style={{ width: 90, height: 90, minWidth: 90 }}
            />
            <CardSaveButton scopeRef={rootRef} />
            <Button onClick={handleDelete} variant="secondary" size="sm" pill className="flex-shrink-0">
              Удалить
            </Button>
          </div>

          <div className="flex gap-2.5 mb-5 flex-wrap">
            {ARC_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                className="text-[12.5px] px-3.5 py-1.5 rounded-full"
                style={{
                  border: `1px solid ${arcType === type ? ARC_TYPE_COLOR[type].bg : "var(--rule)"}`,
                  background: arcType === type ? ARC_TYPE_COLOR[type].bg : "transparent",
                  color: arcType === type ? ARC_TYPE_COLOR[type].fg : "var(--ink-soft)",
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
                  onFieldSaved={handleFieldSaved}
                />
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--faded)" }}>
              Сначала выберите тип арки выше.
            </p>
          )}
          <CommentsBlock model="Character" recordId={character.id} initialComments={initialComments} />
      </Collapse>
    </div>
  );
}
