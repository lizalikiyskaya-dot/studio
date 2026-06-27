"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Story, CycleCharacter, StoryCharacter, ArcType } from "@/generated/prisma/client";
import CharacterCard from "./CharacterCard";
import type { CharacterFieldKey } from "@/features/characters/fields";
import {
  createStoryCharacter,
  deleteStoryCharacter,
  updateStoryCharacterName,
  updateStoryCharacterArcType,
  updateStoryCharacterField,
} from "./actions";
import { Button } from "@/components/ui/Button";

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
            <span className="text-[13px]" style={{ color: "var(--faded)" }}>
              В цикле пока нет персонажей.
            </span>
          )}
          {cycleCharacters.map((c) => (
            <span
              key={c.id}
              className="text-[13px] px-3 py-1.5 rounded-sm"
              style={{ border: "1px solid var(--rule)" }}
            >
              {c.name || "Без имени"}
            </span>
          ))}
        </div>
      </div>
    );
  }

  function handleAdd() {
    startTransition(async () => {
      const character = await createStoryCharacter(story.id);
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

  return (
    <div>
      <h3 className="text-[14px] font-semibold mb-3">Персонажи рассказа</h3>
      {list.map((character) => (
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
      <Button onClick={handleAdd} variant="success-outline" size="sm">
        + новый персонаж рассказа
      </Button>
    </div>
  );
}
