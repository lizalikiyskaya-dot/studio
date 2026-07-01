"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Story, CycleCharacter, StoryCharacter, ArcType } from "@/generated/prisma/client";
import CharacterCard from "./CharacterCard";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import ImageUploadBox from "@/components/ImageUploadBox";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import type { CharacterFieldKey } from "@/features/characters/fields";
import { SECONDARY_CHARACTER_GROUPS } from "@/features/characters/fields";
import {
  createStoryCharacter,
  deleteStoryCharacter,
  updateStoryCharacterName,
  updateStoryCharacterArcType,
  updateStoryCharacterField,
} from "./actions";
import { Button } from "@/components/ui/Button";

// Simple card for secondary story characters using SECONDARY_CHARACTER_GROUPS
function SecondaryCard({
  character,
  onUpdateName,
  onUpdateField,
  onDelete,
}: {
  character: StoryCharacter;
  onUpdateName: (id: string, name: string) => void;
  onUpdateField: (id: string, field: CharacterFieldKey, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(character.photoUrl);
  const [, startTransition] = useTransition();
  const data = (character.data as Record<string, string>) ?? {};

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
        <span style={{ color: "var(--faded)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s", fontSize: 15 }}>▾</span>
      </div>

      {open && (
        <div className="px-4 pb-5 pt-1 border-t" style={{ borderColor: "var(--rule)" }}>
          <div className="flex gap-5 items-center my-4">
            <ImageUploadBox
              value={photoUrl}
              shape="circle"
              onUpload={(file) => {
                setPhotoUrl(URL.createObjectURL(file));
                startTransition(() => { void uploadFile("story-character-photo", character.id, "photoUrl", file); });
              }}
              onDelete={() => {
                setPhotoUrl(null);
                startTransition(() => { void deletePhoto("story-character-photo", character.id, "photoUrl"); });
              }}
              placeholder="фото"
              className="rounded-full flex-shrink-0"
              style={{ width: 90, height: 90, minWidth: 90 }}
            />
            <div className="flex-1 min-w-0">
              <label className="block text-[12.5px] mb-1.5" style={{ color: "var(--faded)" }}>Имя</label>
              <input
                defaultValue={character.name}
                onBlur={(e) => onUpdateName(character.id, e.target.value)}
                className="heading font-semibold text-[18px] outline-none bg-transparent border-b w-full py-1"
                style={{ borderColor: "var(--rule)" }}
              />
            </div>
            <Button onClick={() => { if (window.confirm(`Удалить «${character.name || "без имени"}»?`)) onDelete(character.id); }} variant="secondary" size="sm" pill className="flex-shrink-0">
              удалить
            </Button>
          </div>

          {SECONDARY_CHARACTER_GROUPS.map((group) => (
            <div key={group.title} className="mb-5">
              <h4 className="text-[12px] font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>{group.title}</h4>
              {group.fields.map((f) => (
                <div key={f.key} className="mb-3">
                  {f.label && <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>{f.label}</label>}
                  <AutoGrowTextarea
                    defaultValue={data[f.key] ?? ""}
                    onBlur={(value) => onUpdateField(character.id, f.key as CharacterFieldKey, value)}
                    className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
                    style={{ borderColor: "var(--rule)" }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StoryCharactersSection({
  story,
  cycleCharacters,
  storyCharacters,
}: {
  story: Story;
  cycleCharacters: CycleCharacter[];
  storyCharacters: StoryCharacter[];
}) {
  const router = useRouter();
  const [list, setList] = useState(storyCharacters);
  const [, startTransition] = useTransition();

  if (story.characterSource === "SHARED") {
    return (
      <div>
        <h3 className="text-[14px] font-semibold mb-3">Персонажи</h3>
        <p className="text-[12.5px] mb-3" style={{ color: "var(--faded)" }}>
          Используются персонажи цикла. Чтобы завести своих для этого рассказа — переключите тумблер выше.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {cycleCharacters.length === 0 && (
            <span className="text-[13px]" style={{ color: "var(--faded)" }}>В цикле пока нет персонажей.</span>
          )}
          {cycleCharacters.map((c) => (
            <span key={c.id} className="text-[13px] px-3 py-1.5 rounded-sm" style={{ border: "1px solid var(--rule)" }}>
              {c.name || "Без имени"}
            </span>
          ))}
        </div>
      </div>
    );
  }

  function handleAdd(type: "MAIN" | "SECONDARY") {
    startTransition(async () => {
      const character = await createStoryCharacter(story.id, type);
      setList((prev) => [...prev, character]);
    });
  }

  function handleDelete(id: string) {
    setList((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteStoryCharacter(id));
  }

  function handleUpdateName(id: string, name: string) {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    startTransition(() => updateStoryCharacterName(id, name));
  }

  function handleUpdateArcType(id: string, arcType: ArcType) {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, arcType } : c)));
    startTransition(async () => {
      await updateStoryCharacterArcType(id, arcType);
      router.refresh();
    });
  }

  function handleUpdateField(id: string, field: CharacterFieldKey, value: string) {
    startTransition(() => updateStoryCharacterField(id, field, value));
  }

  const main = list.filter((c) => c.type === "MAIN");
  const secondary = list.filter((c) => c.type === "SECONDARY");

  return (
    <div className="space-y-10">
      <section>
        <h3 className="text-[16px] font-semibold mb-4">Главные персонажи</h3>
        {main.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            uploadTarget="story-character-photo"
            onUpdateName={handleUpdateName}
            onUpdateArcType={handleUpdateArcType}
            onUpdateField={handleUpdateField}
            onDelete={handleDelete}
          />
        ))}
        <Button onClick={() => handleAdd("MAIN")} variant="dashed-sage" size="sm" pill>
          + главный персонаж
        </Button>
      </section>

      <section>
        <h3 className="text-[16px] font-semibold mb-1">Второстепенные персонажи</h3>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-faint)" }}>
          Катализатор · Контраст · Голос темы · Ритм и масштаб
        </p>
        {secondary.map((character) => (
          <SecondaryCard
            key={character.id}
            character={character}
            onUpdateName={handleUpdateName}
            onUpdateField={handleUpdateField}
            onDelete={handleDelete}
          />
        ))}
        <Button onClick={() => handleAdd("SECONDARY")} variant="dashed" size="sm" pill>
          + второстепенный персонаж
        </Button>
      </section>
    </div>
  );
}
