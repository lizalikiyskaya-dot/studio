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
  updateCycleCharacterPhotoUrl,
} from "./actions";
import { Plus } from "lucide-react";

export default function CycleCharactersView({
  cycleId,
  characters,
}: {
  cycleId: string;
  characters: CycleCharacter[];
}) {
  const router = useRouter();
  const [list, setList] = useState(characters);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const character = await createCycleCharacter(cycleId);
      setFreshId(character.id);
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
      {list.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          uploadTarget="cycle-character-photo"
          onUpdateName={handleUpdateName}
          onUpdateArcType={handleUpdateArcType}
          onUpdateField={handleUpdateField}
          onUpdatePhotoUrl={(id, url) => {
            setList((prev) => prev.map((c) => (c.id === id ? { ...c, photoUrl: url } : c)));
            startTransition(() => { void updateCycleCharacterPhotoUrl(id, url); });
          }}
          onDelete={handleDelete}
          startOpen={character.id === freshId}
        />
      ))}
      <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
        <Plus size={16} /> Новый персонаж
      </button>
    </div>
  );
}
