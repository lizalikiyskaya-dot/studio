"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CycleCharacter, ArcType } from "@/generated/prisma/client";
import CharacterCard from "./CharacterCard";
import type { CharacterFieldKey } from "@/features/characters/fields";
import {
  createCycleCharacter,
  deleteCycleCharacter,
  updateCycleCharacterName,
  updateCycleCharacterArcType,
  updateCycleCharacterField,
} from "./actions";
import { Button } from "@/components/ui/Button";

export default function CycleCharactersView({
  cycleId,
  characters,
}: {
  cycleId: string;
  characters: CycleCharacter[];
}) {
  const router = useRouter();
  const [list, setList] = useState(characters);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const character = await createCycleCharacter(cycleId);
      setList((prev) => [...prev, character]);
    });
  }

  function handleDelete(id: string) {
    setList((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteCycleCharacter(id));
  }

  function handleUpdateName(id: string, name: string) {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    startTransition(() => updateCycleCharacterName(id, name));
  }

  function handleUpdateArcType(id: string, arcType: ArcType) {
    setList((prev) => prev.map((c) => (c.id === id ? { ...c, arcType } : c)));
    startTransition(async () => {
      await updateCycleCharacterArcType(id, arcType);
      router.refresh();
    });
  }

  function handleUpdateField(id: string, field: CharacterFieldKey, value: string) {
    startTransition(() => updateCycleCharacterField(id, field, value));
  }

  return (
    <div>
      <p className="text-[13px] mb-4" style={{ color: "var(--faded)" }}>
        Эти персонажи общие для всего цикла — рассказы с источником «общие» подтягивают их автоматически.
      </p>
      {list.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          uploadTarget="cycle-character-photo"
          onUpdateName={handleUpdateName}
          onUpdateArcType={handleUpdateArcType}
          onUpdateField={handleUpdateField}
          onDelete={handleDelete}
        />
      ))}
      <Button onClick={handleAdd} variant="success" size="sm" pill>
        + новый персонаж цикла
      </Button>
    </div>
  );
}
