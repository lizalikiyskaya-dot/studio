"use client";

import { useState, useTransition } from "react";
import type { Character, Comment } from "@/generated/prisma/client";
import ArcCharacterCard from "./ArcCharacterCard";
import DragHandle from "@/components/DragHandle";
import { createCharacter, reorderCharacters } from "../actions";
import { useDragReorder } from "@/lib/useDragReorder";

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
  const { dropTarget, dragHandle } = useDragReorder(characters, setCharacters, (orderedIds) =>
    startTransition(() => reorderCharacters(bookId, orderedIds))
  );

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
        <div key={character.id} {...dropTarget(character.id)} className="flex items-start gap-1.5">
          <DragHandle handlers={dragHandle(character.id)} />
          <div className="flex-1 min-w-0">
            <ArcCharacterCard
              character={character}
              suggestions={suggestions[character.id] ?? {}}
              initialComments={comments[character.id] ?? []}
              onDeleted={handleDeleted}
            />
          </div>
        </div>
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
