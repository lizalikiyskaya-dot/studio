"use client";

import { useState, useTransition } from "react";
import type { PopArcCharacter } from "@/generated/prisma/client";
import CharacterProfile from "@/features/characters/CharacterProfile";
import Accordion from "@/components/Accordion";
import { ARC_GROUPS } from "@/features/characters/fields";
import {
  createPopArcCharacter,
  deletePopArcCharacter,
  updatePopArcName,
  updatePopArcField,
  updatePopArcPhoto,
} from "./actions";

function CharacterCard({
  character,
  readOnly,
  onDelete,
}: {
  character: PopArcCharacter;
  readOnly: boolean;
  onDelete: (id: string) => void;
}) {
  const [, startTransition] = useTransition();

  return (
    <CharacterProfile
      name={character.name}
      photoUrl={character.photoUrl}
      data={(character.data as Record<string, string>) ?? {}}
      groups={ARC_GROUPS}
      readOnly={readOnly}
      onNameBlur={(value) => startTransition(() => updatePopArcName(character.id, value))}
      onFieldBlur={(field, value) => startTransition(() => updatePopArcField(character.id, field, value))}
      onPhotoUpload={(dataUrl) => startTransition(() => updatePopArcPhoto(character.id, dataUrl))}
      onDelete={() => onDelete(character.id)}
    />
  );
}

export function ExamplesList({
  studentId,
  initialCharacters,
  isMentorViewer,
}: {
  studentId: string;
  initialCharacters: PopArcCharacter[];
  isMentorViewer: boolean;
}) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const character = await createPopArcCharacter(studentId, true);
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
        <Accordion key={character.id} title={character.name || "Без названия"}>
          <CharacterCard character={character} readOnly={!isMentorViewer} onDelete={handleDelete} />
        </Accordion>
      ))}

      {isMentorViewer && (
        <button
          onClick={handleAdd}
          className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
          style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
        >
          + добавить пример
        </button>
      )}
    </div>
  );
}

export function OwnHeroesList({
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
      const character = await createPopArcCharacter(studentId, false);
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
        <CharacterCard key={character.id} character={character} readOnly={false} onDelete={handleDelete} />
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
