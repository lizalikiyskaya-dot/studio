"use client";

import { useState, useTransition } from "react";
import type { Character } from "@/generated/prisma/client";
import ArcCharacterCard from "./ArcCharacterCard";
import { createCharacter } from "../actions";

export default function ArcCharactersList({
  bookId,
  initialCharacters,
  suggestions,
}: {
  bookId: string;
  initialCharacters: Character[];
  suggestions: Record<string, Record<string, string>>;
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
        <ArcCharacterCard
          key={character.id}
          character={character}
          suggestions={suggestions[character.id] ?? {}}
          onDeleted={handleDeleted}
        />
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
