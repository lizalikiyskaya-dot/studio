"use client";

import { useState, useTransition } from "react";
import type { PopArcCharacter } from "@/generated/prisma/client";
import CharacterProfile from "@/features/characters/CharacterProfile";
import { ARC_GROUPS } from "@/features/characters/fields";
import {
  createPopArcCharacter,
  deletePopArcCharacter,
  updatePopArcName,
  updatePopArcField,
  updatePopArcPhoto,
} from "./actions";

export default function PopArcsList({
  studentId,
  initialCharacters,
}: {
  studentId: string;
  initialCharacters: PopArcCharacter[];
}) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const character = await createPopArcCharacter(studentId);
      setCharacters((prev) => [...prev, character]);
    });
  }

  function handleDelete(id: string) {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deletePopArcCharacter(id));
  }

  return (
    <div>
      {characters.map((character) => (
        <CharacterProfile
          key={character.id}
          name={character.name}
          photoUrl={character.photoUrl}
          data={(character.data as Record<string, string>) ?? {}}
          groups={ARC_GROUPS}
          onNameBlur={(value) => startTransition(() => updatePopArcName(character.id, value))}
          onFieldBlur={(field, value) => startTransition(() => updatePopArcField(character.id, field, value))}
          onPhotoUpload={(dataUrl) => startTransition(() => updatePopArcPhoto(character.id, dataUrl))}
          onDelete={() => handleDelete(character.id)}
        />
      ))}

      <button
        onClick={handleAdd}
        className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + добавить героя
      </button>
    </div>
  );
}
