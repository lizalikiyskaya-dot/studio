"use client";

import { useState, useTransition } from "react";
import type { Character, Comment } from "@/generated/prisma/client";
import CharacterProfile from "./CharacterProfile";
import CollapsibleCharacterShell from "@/components/CollapsibleCharacterShell";
import CommentsBlock from "@/features/comments/CommentsBlock";
import DragHandle from "@/components/DragHandle";
import { createCharacter, deleteCharacter, reorderCharacters } from "./actions";
import { uploadFile } from "@/lib/uploadFile";
import { useDragReorder } from "@/lib/useDragReorder";
import type { FieldGroup } from "./fields";
import { Button } from "@/components/ui/Button";

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
  const { dropTarget, dragHandle } = useDragReorder(characters, setCharacters, (orderedIds) =>
    startTransition(() => reorderCharacters(bookId, orderedIds))
  );

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

  function handlePhotoUpload(id: string, file: File) {
    const objectUrl = URL.createObjectURL(file);
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, photoUrl: objectUrl } : c)));
    startTransition(() => { void uploadFile("character-photo", id, "photoUrl", file); });
  }

  function handleNameSaved(id: string, name: string) {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  function handleFieldSaved(id: string, field: string, value: string) {
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, data: { ...((c.data as Record<string, string>) ?? {}), [field]: value } } : c
      )
    );
  }

  return (
    <div>
      {characters.map((character) => {
        const charSuggestions = suggestions[character.id] ?? {};
        return (
          <div key={character.id} {...dropTarget(character.id)} className="flex items-start gap-1.5">
            <DragHandle handlers={dragHandle(character.id)} />
            <div className="flex-1 min-w-0">
              <CollapsibleCharacterShell name={character.name} photoUrl={character.photoUrl}>
                <CharacterProfile
                  name={character.name}
                  photoUrl={character.photoUrl}
                  data={(character.data as Record<string, string>) ?? {}}
                  groups={groups}
                  onNameBlur={(name) => handleNameSaved(character.id, name)}
                  onFieldBlur={(field, value) => handleFieldSaved(character.id, field, value)}
                  onPhotoUpload={(file) => handlePhotoUpload(character.id, file)}
                  onDelete={() => handleDelete(character.id)}
                  suggestable={{ model: "Character", recordId: character.id }}
                  nameSuggestion={charSuggestions.name}
                  fieldSuggestions={charSuggestions}
                />
                <CommentsBlock model="Character" recordId={character.id} initialComments={comments[character.id] ?? []} />
              </CollapsibleCharacterShell>
            </div>
          </div>
        );
      })}

      <Button onClick={handleAdd} variant="secondary" size="sm">
        + добавить персонажа
      </Button>
    </div>
  );
}
