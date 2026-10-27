"use client";

import { useRef, useState, useTransition } from "react";
import type { StoryCircleCard, Comment, TaskStatus } from "@/generated/prisma/client";
import ExerciseStatusControl from "@/features/exercises/ExerciseStatusControl";
import { setStoryCircleStatus } from "@/features/exercises/cardStatus";
import CollapsibleCharacterShell from "@/components/CollapsibleCharacterShell";
import CardSaveButton from "@/components/CardSaveButton";
import ImageUploadBox from "@/components/ImageUploadBox";
import CommentsBlock from "@/features/comments/CommentsBlock";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { CardTitle } from "@/components/InlineTitle";
import StoryCircleDiagram from "./StoryCircleDiagram";
import { STORY_CIRCLE_STEPS } from "./steps";
import { createStoryCircleCard, deleteStoryCircleCard, reorderStoryCircleCards, updateStoryCircleHero } from "./actions";
import DragHandle from "@/components/DragHandle";
import { useDragReorder, type DropTargetHandlers, type DragHandleHandlers } from "@/lib/useDragReorder";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { Button } from "@/components/ui/Button";

function CardBody({
  card,
  readOnly,
  suggestions,
  photoUrl,
  onPhotoChange,
}: {
  card: StoryCircleCard;
  readOnly: boolean;
  suggestions: Record<string, string>;
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}) {
  const data = (card.data as Record<string, string>) ?? {};
  const [hoverStep, setHoverStep] = useState<number | undefined>(undefined);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <ImageUploadBox
          value={photoUrl}
          shape="circle"
          placeholder="фото"
          className="rounded-full flex-shrink-0"
          style={{ width: 64, height: 64 }}
          onUpload={(file) => {
            onPhotoChange(URL.createObjectURL(file));
            void uploadFile("storycircle-photo", card.id, "photoUrl", file);
          }}
          onDelete={() => {
            onPhotoChange(null);
            void deletePhoto("storycircle-photo", card.id, "photoUrl");
          }}
        />
      </div>
      <div className="mb-5">
        <StoryCircleDiagram activeStep={hoverStep} />
      </div>
      {STORY_CIRCLE_STEPS.map((step) => (
        <div
          key={step.key}
          className="mb-4"
          onMouseEnter={() => setHoverStep(step.n)}
          onMouseLeave={() => setHoverStep(undefined)}
        >
          <label className="mb-1 block text-[12.5px] leading-snug" style={{ color: "var(--muted)" }}>
            <span className="heading font-semibold" style={{ color: "var(--ink)" }}>
              {step.n}. {step.short}
            </span>{" "}
            — {step.label}
          </label>
          {readOnly ? (
            <p className="field-literary rounded-[14px] px-3.5 py-2.5 text-[15.5px] leading-relaxed" style={{ border: "1px solid var(--border)", minHeight: 72 }}>
              {data[step.key] || <span style={{ color: "var(--faded)" }}>—</span>}
            </p>
          ) : (
            <SuggestableField
              model="StoryCircleCard"
              recordId={card.id}
              field={step.key}
              value={data[step.key] ?? ""}
              suggestion={suggestions[step.key]}
              className="fld field-literary w-full text-[15.5px] leading-relaxed"
              style={{ minHeight: 72 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CardShell({
  card,
  readOnly,
  suggestions,
  initialComments,
  onDelete,
  onHeroSaved,
  dropTarget,
  dragHandle,
  trackStatus = false,
  isMentorViewer = false,
}: {
  card: StoryCircleCard;
  readOnly: boolean;
  suggestions: Record<string, string>;
  initialComments: Comment[];
  onDelete: (id: string) => void;
  onHeroSaved: (value: string) => void;
  dropTarget?: DropTargetHandlers;
  dragHandle?: DragHandleHandlers;
  trackStatus?: boolean;
  isMentorViewer?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [photoUrl, setPhotoUrl] = useState(card.photoUrl);
  const [status, setStatus] = useState<TaskStatus>(card.status);
  const [, startTransition] = useTransition();
  function handleStatus(next: TaskStatus) {
    setStatus(next);
    startTransition(() => {
      void setStoryCircleStatus(card.id, next);
    });
  }
  return (
    <div {...dropTarget} id={`exercise-${card.id}`} className="flex items-start gap-1.5">
      {dragHandle && <DragHandle handlers={dragHandle} />}
      <div ref={rootRef} className="flex-1 min-w-0">
        <CollapsibleCharacterShell
          headerExtra={
            trackStatus ? (
              <ExerciseStatusControl status={status} isMentor={isMentorViewer} onChange={handleStatus} />
            ) : undefined
          }
          name={card.hero}
          photoUrl={photoUrl}
          title={
            readOnly ? undefined : (
              <CardTitle
                value={card.hero}
                placeholder="Герой"
                model="StoryCircleCard"
                recordId={card.id}
                field="hero"
                suggestion={suggestions.hero}
                onSave={onHeroSaved}
                className="min-w-0 flex-1 text-[14.5px]"
              />
            )
          }
        >
          <CardBody
            card={card}
            readOnly={readOnly}
            suggestions={suggestions}
            photoUrl={photoUrl}
            onPhotoChange={setPhotoUrl}
          />
          {!readOnly && (
            <div className="flex gap-1.5 mt-4">
              <CardSaveButton scopeRef={rootRef} />
              <Button onClick={() => onDelete(card.id)} variant="secondary" size="sm" pill>
                удалить
              </Button>
            </div>
          )}
          <CommentsBlock model="StoryCircleCard" recordId={card.id} initialComments={initialComments} />
        </CollapsibleCharacterShell>
      </div>
    </div>
  );
}

export function StoryCircleExamplesList({
  studentId,
  initialCards,
  isMentorViewer,
  comments,
}: {
  studentId: string;
  initialCards: StoryCircleCard[];
  isMentorViewer: boolean;
  comments: Record<string, Comment[]>;
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();
  const { dropTarget, dragHandle } = useDragReorder(cards, setCards, (orderedIds) =>
    startTransition(() => reorderStoryCircleCards(studentId, true, orderedIds))
  );

  function handleAdd() {
    startTransition(async () => {
      const card = await createStoryCircleCard(studentId, true);
      setCards((prev) => [...prev, card]);
    });
  }

  function handleDelete(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteStoryCircleCard(id));
  }

  function handleHeroSaved(id: string, hero: string) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, hero } : c)));
    startTransition(() => updateStoryCircleHero(id, hero));
  }

  return (
    <div>
      {cards.map((card) => (
        <CardShell
          key={card.id}
          card={card}
          readOnly={!isMentorViewer}
          suggestions={{}}
          initialComments={comments[card.id] ?? []}
          onDelete={handleDelete}
          onHeroSaved={(hero) => handleHeroSaved(card.id, hero)}
          dropTarget={dropTarget(card.id)}
          dragHandle={isMentorViewer ? dragHandle(card.id) : undefined}
        />
      ))}
      {isMentorViewer && (
        <Button onClick={handleAdd} variant="dashed" size="sm" pill>
          + добавить пример
        </Button>
      )}
    </div>
  );
}

export function StoryCircleOwnList({
  studentId,
  initialCards,
  suggestions,
  comments,
  isMentorViewer,
}: {
  studentId: string;
  initialCards: StoryCircleCard[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
  isMentorViewer: boolean;
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();
  const { dropTarget, dragHandle } = useDragReorder(cards, setCards, (orderedIds) =>
    startTransition(() => reorderStoryCircleCards(studentId, false, orderedIds))
  );

  function handleAdd() {
    startTransition(async () => {
      const card = await createStoryCircleCard(studentId, false);
      setCards((prev) => [...prev, card]);
    });
  }

  function handleDelete(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteStoryCircleCard(id));
  }

  function handleHeroSaved(id: string, hero: string) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, hero } : c)));
    startTransition(() => updateStoryCircleHero(id, hero));
  }

  return (
    <div>
      {cards.map((card) => (
        <CardShell
          key={card.id}
          card={card}
          readOnly={false}
          suggestions={suggestions[card.id] ?? {}}
          initialComments={comments[card.id] ?? []}
          onDelete={handleDelete}
          onHeroSaved={(hero) => handleHeroSaved(card.id, hero)}
          dropTarget={dropTarget(card.id)}
          dragHandle={dragHandle(card.id)}
          trackStatus
          isMentorViewer={isMentorViewer}
        />
      ))}
      <Button onClick={handleAdd} variant="dashed" size="sm" pill>
        + добавить героя
      </Button>
    </div>
  );
}
