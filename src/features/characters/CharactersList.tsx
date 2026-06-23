"use client";

import { useState, useTransition } from "react";
import type { Character } from "@/generated/prisma/client";
import CharacterProfile from "./CharacterProfile";
import { createCharacter } from "./actions";
import type { FieldGroup } from "./fields";

export default function CharactersList({
  bookId,
  initialCharacters,
  groups,
}: {
  bookId: string;
  initialCharacters: Character[];
  groups: FieldGroup[];
}) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const character = await createCharacter(bookId);
      setCharacters((prev) => [...prev, character]);
    });
  }

  function handleDeleted(id: string) {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      {characters.map((character) => (
        <CharacterProfile key={character.id} character={character} groups={groups} onDeleted={handleDeleted} />
      ))}

      <button
        onClick={handleAdd}
        className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + добавить персонажа
      </button>
    </div>
  );
}
