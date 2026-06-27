"use client";

import { useRef, useState, useTransition } from "react";
import type { BeliefCard, Comment } from "@/generated/prisma/client";
import CollapsibleCharacterShell from "@/components/CollapsibleCharacterShell";
import CardSaveButton from "@/components/CardSaveButton";
import ImageUploadBox from "@/components/ImageUploadBox";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { createBeliefCard, deleteBeliefCard, reorderBeliefCards } from "./actions";
import DragHandle from "@/components/DragHandle";
import { useDragReorder, type DropTargetHandlers, type DragHandleHandlers } from "@/lib/useDragReorder";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { Button } from "@/components/ui/Button";

function CardBody({
  card,
  readOnly,
  suggestable,
  suggestions,
  onHeroSaved,
  photoUrl,
  onPhotoChange,
}: {
  card: BeliefCard;
  readOnly: boolean;
  suggestable: boolean;
  suggestions: Record<string, string>;
  onHeroSaved: (value: string) => void;
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}) {
  return (
    <div>
      <div className="flex gap-4 items-start mb-3">
        <ImageUploadBox
          value={photoUrl}
          shape="circle"
          placeholder="фото"
          className="rounded-full flex-shrink-0"
          style={{ width: 64, height: 64 }}
          onUpload={(file) => {
            onPhotoChange(URL.createObjectURL(file));
            void uploadFile("belief-photo", card.id, "photoUrl", file);
          }}
          onDelete={() => {
            onPhotoChange(null);
            void deletePhoto("belief-photo", card.id, "photoUrl");
          }}
        />
        <div className="flex-1">
          <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
            Герой
          </label>
          {readOnly ? (
            <p className="heading text-[15px] font-semibold pb-1">{card.hero}</p>
          ) : (
            <SuggestableField
              model="BeliefCard"
              recordId={card.id}
              field="hero"
              value={card.hero}
              suggestion={suggestions.hero}
              as="input"
              onSaved={onHeroSaved}
              className="heading w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1"
              style={{ borderColor: "var(--rule)" }}
            />
          )}
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
          В начале истории герой думает, что...
        </label>
        {readOnly ? (
          <p className="text-[13.5px] leading-relaxed pb-1 border-b" style={{ borderColor: "var(--rule)" }}>
            {card.startBelief}
          </p>
        ) : (
          <SuggestableField
            model="BeliefCard"
            recordId={card.id}
            field="startBelief"
            value={card.startBelief}
            suggestion={suggestions.startBelief}
            className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
            style={{ borderColor: "var(--rule)" }}
          />
        )}
      </div>
      <div>
        <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
          В конце истории понимает, что...
        </label>
        {readOnly ? (
          <p className="text-[13.5px] leading-relaxed pb-1 border-b" style={{ borderColor: "var(--rule)" }}>
            {card.endBelief}
          </p>
        ) : (
          <SuggestableField
            model="BeliefCard"
            recordId={card.id}
            field="endBelief"
            value={card.endBelief}
            suggestion={suggestions.endBelief}
            className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
            style={{ borderColor: "var(--rule)" }}
          />
        )}
      </div>
    </div>
  );
}

function CardShell({
  card,
  readOnly,
  suggestable,
  suggestions,
  initialComments,
  onDelete,
  onHeroSaved,
  dropTarget,
  dragHandle,
}: {
  card: BeliefCard;
  readOnly: boolean;
  suggestable: boolean;
  suggestions: Record<string, string>;
  initialComments: Comment[];
  onDelete: (id: string) => void;
  onHeroSaved: (value: string) => void;
  dropTarget?: DropTargetHandlers;
  dragHandle?: DragHandleHandlers;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [photoUrl, setPhotoUrl] = useState(card.photoUrl);
  return (
    <div {...dropTarget} className="flex items-start gap-1.5">
      {dragHandle && <DragHandle handlers={dragHandle} />}
      <div ref={rootRef} className="flex-1 min-w-0">
        <CollapsibleCharacterShell name={card.hero} photoUrl={photoUrl}>
          <CardBody
            card={card}
            readOnly={readOnly}
            suggestable={suggestable}
            suggestions={suggestions}
            onHeroSaved={onHeroSaved}
            photoUrl={photoUrl}
            onPhotoChange={setPhotoUrl}
          />
          {!readOnly && (
            <div className="flex gap-1.5 mt-4">
              <CardSaveButton scopeRef={rootRef} />
              <Button onClick={() => onDelete(card.id)} variant="secondary" size="sm">
                Удалить
              </Button>
            </div>
          )}
          <CommentsBlock model="BeliefCard" recordId={card.id} initialComments={initialComments} />
        </CollapsibleCharacterShell>
      </div>
    </div>
  );
}

export function BeliefExamplesList({
  studentId,
  initialCards,
  isMentorViewer,
  comments,
}: {
  studentId: string;
  initialCards: BeliefCard[];
  isMentorViewer: boolean;
  comments: Record<string, Comment[]>;
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();
  const { dropTarget, dragHandle } = useDragReorder(cards, setCards, (orderedIds) =>
    startTransition(() => reorderBeliefCards(studentId, true, orderedIds))
  );

  function handleAdd() {
    startTransition(async () => {
      const card = await createBeliefCard(studentId, true);
      setCards((prev) => [...prev, card]);
    });
  }

  function handleDelete(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteBeliefCard(id));
  }

  function handleHeroSaved(id: string, hero: string) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, hero } : c)));
  }

  return (
    <div>
      {cards.map((card) => (
        <CardShell
          key={card.id}
          card={card}
          readOnly={!isMentorViewer}
          suggestable={false}
          suggestions={{}}
          initialComments={comments[card.id] ?? []}
          onDelete={handleDelete}
          onHeroSaved={(hero) => handleHeroSaved(card.id, hero)}
          dropTarget={dropTarget(card.id)}
          dragHandle={isMentorViewer ? dragHandle(card.id) : undefined}
        />
      ))}
      {isMentorViewer && (
        <Button onClick={handleAdd} variant="secondary" size="sm">
          + добавить пример
        </Button>
      )}
    </div>
  );
}

export function BeliefOwnList({
  studentId,
  initialCards,
  suggestions,
  comments,
}: {
  studentId: string;
  initialCards: BeliefCard[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();
  const { dropTarget, dragHandle } = useDragReorder(cards, setCards, (orderedIds) =>
    startTransition(() => reorderBeliefCards(studentId, false, orderedIds))
  );

  function handleAdd() {
    startTransition(async () => {
      const card = await createBeliefCard(studentId, false);
      setCards((prev) => [...prev, card]);
    });
  }

  function handleDelete(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteBeliefCard(id));
  }

  function handleHeroSaved(id: string, hero: string) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, hero } : c)));
  }

  return (
    <div>
      {cards.map((card) => (
        <CardShell
          key={card.id}
          card={card}
          readOnly={false}
          suggestable
          suggestions={suggestions[card.id] ?? {}}
          initialComments={comments[card.id] ?? []}
          onDelete={handleDelete}
          onHeroSaved={(hero) => handleHeroSaved(card.id, hero)}
          dropTarget={dropTarget(card.id)}
          dragHandle={dragHandle(card.id)}
        />
      ))}
      <Button onClick={handleAdd} variant="secondary" size="sm">
        + добавить героя
      </Button>
    </div>
  );
}
