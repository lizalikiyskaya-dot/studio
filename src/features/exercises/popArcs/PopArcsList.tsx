"use client";

import { useState, useTransition } from "react";
import type { PopArcCharacter, Comment } from "@/generated/prisma/client";
import PopArcCard from "./PopArcCard";
import { createPopArcCharacter, deletePopArcCharacter, reorderPopArcCharacters } from "./actions";
import DragHandle from "@/components/DragHandle";
import { useDragReorder } from "@/lib/useDragReorder";
import { Button } from "@/components/ui/Button";

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
  const { dropTarget, dragHandle } = useDragReorder(characters, setCharacters, (orderedIds) =>
    startTransition(() => reorderPopArcCharacters(studentId, true, orderedIds))
  );

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
        <div key={character.id} {...dropTarget(character.id)} className="flex items-start gap-1.5">
          {isMentorViewer && <DragHandle handlers={dragHandle(character.id)} />}
          <div className="flex-1 min-w-0">
            <PopArcCard
              character={character}
              readOnly={!isMentorViewer}
              suggestions={{}}
              initialComments={comments[character.id] ?? []}
              onDelete={() => handleDelete(character.id)}
            />
          </div>
        </div>
      ))}

      {isMentorViewer && (
        <Button onClick={handleAdd} variant="secondary" size="sm">
          + добавить пример
        </Button>
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
  const { dropTarget, dragHandle } = useDragReorder(characters, setCharacters, (orderedIds) =>
    startTransition(() => reorderPopArcCharacters(studentId, false, orderedIds))
  );

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
        <div key={character.id} {...dropTarget(character.id)} className="flex items-start gap-1.5">
          <DragHandle handlers={dragHandle(character.id)} />
          <div className="flex-1 min-w-0">
            <PopArcCard
              character={character}
              readOnly={false}
              suggestions={suggestions[character.id] ?? {}}
              initialComments={comments[character.id] ?? []}
              onDelete={() => handleDelete(character.id)}
            />
          </div>
        </div>
      ))}

      <Button onClick={handleAdd} variant="secondary" size="sm">
        + добавить героя
      </Button>
    </div>
  );
}
