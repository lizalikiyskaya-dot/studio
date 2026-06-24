"use client";

import { useState, useTransition } from "react";
import type { Character, Comment } from "@/generated/prisma/client";
import CharacterProfile from "./CharacterProfile";
import CollapsibleCharacterShell from "@/components/CollapsibleCharacterShell";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { createCharacter, deleteCharacter, updateCharacterPhoto } from "./actions";
import type { FieldGroup } from "./fields";

export default function CharactersList({
  bookId,
  initialCharacters,
  groups,
  suggestions,
  comments,
}: {
  bookId: string;
  initialCharacters: Character[];
  groups: FieldGroup[];
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

  function handleDelete(id: string) {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteCharacter(id));
  }

  return (
    <div>
      {characters.map((character) => {
        const charSuggestions = suggestions[character.id] ?? {};
        return (
          <CollapsibleCharacterShell key={character.id} name={character.name} photoUrl={character.photoUrl}>
            <CharacterProfile
              name={character.name}
              photoUrl={character.photoUrl}
              data={(character.data as Record<string, string>) ?? {}}
              groups={groups}
              onNameBlur={() => {}}
              onFieldBlur={() => {}}
              onPhotoUpload={(dataUrl) => startTransition(() => updateCharacterPhoto(character.id, dataUrl))}
              onDelete={() => handleDelete(character.id)}
              suggestable={{ model: "Character", recordId: character.id }}
              nameSuggestion={charSuggestions.name}
              fieldSuggestions={charSuggestions}
            />
            <CommentsBlock model="Character" recordId={character.id} initialComments={comments[character.id] ?? []} />
          </CollapsibleCharacterShell>
        );
      })}

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
