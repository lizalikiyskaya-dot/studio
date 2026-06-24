"use client";

import { useState, useTransition } from "react";
import type { Character, Comment } from "@/generated/prisma/client";
import ArcCharacterCard from "./ArcCharacterCard";
import { createCharacter } from "../actions";

export default function ArcCharactersList({
  bookId,
  initialCharacters,
  suggestions,
  comments,
}: {
  bookId: string;
  initialCharacters: Character[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
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
          initialComments={comments[character.id] ?? []}
          onDeleted={handleDeleted}
        />
      ))}

      <button
        onClick={handleAdd}
        className="text-[12.5px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + добавить персонажа
      </button>
    </div>
  );
}
