"use client";

import { useState, useTransition } from "react";
import type { Character, Comment } from "@/generated/prisma/client";
import CharacterProfile from "./CharacterProfile";
import CollapsibleCharacterShell from "@/components/CollapsibleCharacterShell";
import CommentsBlock from "@/features/comments/CommentsBlock";
import DragHandle from "@/components/DragHandle";
import { createCharacter, deleteCharacter, reorderCharacters, updateCharacterPhotoUrl } from "./actions";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { useDragReorder } from "@/lib/useDragReorder";
import type { FieldGroup } from "./fields";
import { Button } from "@/components/ui/Button";
import { CHARACTER_DEFAULTS } from "@/lib/characterDefaults";

function CharacterSection({
  bookId,
  characters,
  groups,
  suggestions,
  comments,
  type,
  onAdd,
}: {
  bookId: string;
  characters: Character[];
  groups: FieldGroup[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
  type: "MAIN" | "SECONDARY";
  onAdd: (c: Character) => void;
}) {
  const [items, setItems] = useState(characters);
  const [, startTransition] = useTransition();
  const { dropTarget, dragHandle } = useDragReorder(items, setItems, (orderedIds) =>
    startTransition(() => reorderCharacters(bookId, orderedIds))
  );

  function handleAdd() {
    startTransition(async () => {
      const character = await createCharacter(bookId, type);
      setItems((prev) => [...prev, character]);
      onAdd(character);
    });
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteCharacter(id));
  }

  function handlePhotoUpload(id: string, file: File) {
    const objectUrl = URL.createObjectURL(file);
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, photoUrl: objectUrl } : c)));
    startTransition(() => { void uploadFile("character-photo", id, "photoUrl", file); });
  }

  function handlePhotoDelete(id: string) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, photoUrl: null } : c)));
    startTransition(() => { void deletePhoto("character-photo", id, "photoUrl"); });
  }

  function handleNameSaved(id: string, name: string) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }

  function handleFieldSaved(id: string, field: string, value: string) {
    setItems((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, data: { ...((c.data as Record<string, string>) ?? {}), [field]: value } } : c
      )
    );
  }

  return (
    <div>
      {items.map((character) => {
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
                  onPhotoDelete={() => handlePhotoDelete(character.id)}
                  onPhotoSelectUrl={(url) => {
                    setItems((prev) => prev.map((c) => (c.id === character.id ? { ...c, photoUrl: url } : c)));
                    startTransition(() => { void updateCharacterPhotoUrl(character.id, url); });
                  }}
                  photoDefaults={CHARACTER_DEFAULTS}
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

      <Button onClick={handleAdd} variant="dashed" size="sm" pill>
        {type === "SECONDARY" ? "+ второстепенный персонаж" : "+ главный персонаж"}
      </Button>
    </div>
  );
}

export default function CharactersList({
  bookId,
  initialCharacters,
  mainGroups,
  secondaryGroups,
  suggestions,
  comments,
}: {
  bookId: string;
  initialCharacters: Character[];
  mainGroups: FieldGroup[];
  secondaryGroups: FieldGroup[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
}) {
  const [allChars, setAllChars] = useState(initialCharacters);

  const main = allChars.filter((c) => c.type === "MAIN");
  const secondary = allChars.filter((c) => c.type === "SECONDARY");

  function handleAdd(c: Character) {
    setAllChars((prev) => [...prev, c]);
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-[16px] font-semibold mb-4" style={{ color: "var(--ink)" }}>
          Главные персонажи
        </h2>
        <CharacterSection
          bookId={bookId}
          characters={main}
          groups={mainGroups}
          suggestions={suggestions}
          comments={comments}
          type="MAIN"
          onAdd={handleAdd}
        />
      </section>

      <section>
        <h2 className="text-[16px] font-semibold mb-1" style={{ color: "var(--ink)" }}>
          Второстепенные персонажи
        </h2>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-faint)" }}>
          Катализатор · Контраст · Голос темы · Ритм и масштаб
        </p>
        <CharacterSection
          bookId={bookId}
          characters={secondary}
          groups={secondaryGroups}
          suggestions={suggestions}
          comments={comments}
          type="SECONDARY"
          onAdd={handleAdd}
        />
      </section>
    </div>
  );
}
