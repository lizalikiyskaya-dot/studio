"use client";

import { useState, useTransition } from "react";
import type { PopArcCharacter, Comment } from "@/generated/prisma/client";
import PopArcCard from "./PopArcCard";
import { createPopArcCharacter, deletePopArcCharacter } from "./actions";

export function ExamplesList({
  studentId,
  initialCharacters,
  isMentorViewer,
  comments,
}: {
  studentId: string;
  initialCharacters: PopArcCharacter[];
  isMentorViewer: boolean;
  comments: Record<string, Comment[]>;
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
        <PopArcCard
          key={character.id}
          character={character}
          readOnly={!isMentorViewer}
          suggestions={{}}
          initialComments={comments[character.id] ?? []}
          onDelete={() => handleDelete(character.id)}
        />
      ))}

      {isMentorViewer && (
        <button
          onClick={handleAdd}
          className="text-[12.5px] px-3 py-1.5 rounded-sm"
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
  comments,
}: {
  studentId: string;
  initialCharacters: PopArcCharacter[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
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
        <PopArcCard
          key={character.id}
          character={character}
          readOnly={false}
          suggestions={suggestions[character.id] ?? {}}
          initialComments={comments[character.id] ?? []}
          onDelete={() => handleDelete(character.id)}
        />
      ))}

      <button
        onClick={handleAdd}
        className="text-[12.5px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + добавить героя
      </button>
    </div>
  );
}
