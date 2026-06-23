"use client";

import { useState, useTransition } from "react";
import type { PopArcCharacter } from "@/generated/prisma/client";
import CharacterProfile from "@/features/characters/CharacterProfile";
import CollapsibleCharacterShell from "@/components/CollapsibleCharacterShell";
import { ARC_GROUPS } from "@/features/characters/fields";
import {
  createPopArcCharacter,
  deletePopArcCharacter,
  updatePopArcPhoto,
} from "./actions";

function CharacterCard({
  character,
  readOnly,
  suggestable,
  suggestions,
  onDelete,
}: {
  character: PopArcCharacter;
  readOnly: boolean;
  suggestable: boolean;
  suggestions: Record<string, string>;
  onDelete: (id: string) => void;
}) {
  const [, startTransition] = useTransition();

  return (
    <CollapsibleCharacterShell name={character.name} photoUrl={character.photoUrl}>
      <CharacterProfile
        name={character.name}
        photoUrl={character.photoUrl}
        data={(character.data as Record<string, string>) ?? {}}
        groups={ARC_GROUPS}
        readOnly={readOnly}
        onNameBlur={() => {}}
        onFieldBlur={() => {}}
        onPhotoUpload={(dataUrl) => startTransition(() => updatePopArcPhoto(character.id, dataUrl))}
        onDelete={() => onDelete(character.id)}
        suggestable={suggestable ? { model: "PopArcCharacter", recordId: character.id } : undefined}
        nameSuggestion={suggestions.name}
        fieldSuggestions={suggestions}
      />
    </CollapsibleCharacterShell>
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
        <CharacterCard
          key={character.id}
          character={character}
          readOnly={!isMentorViewer}
          suggestable={false}
          suggestions={{}}
          onDelete={handleDelete}
        />
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
  suggestions,
}: {
  studentId: string;
  initialCharacters: PopArcCharacter[];
  suggestions: Record<string, Record<string, string>>;
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
        <CharacterCard
          key={character.id}
          character={character}
          readOnly={false}
          suggestable
          suggestions={suggestions[character.id] ?? {}}
          onDelete={handleDelete}
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
