"use client";

import { useState, useTransition } from "react";
import type { StoryCircleCard, Comment } from "@/generated/prisma/client";
import CollapsibleCharacterShell from "@/components/CollapsibleCharacterShell";
import CommentsBlock from "@/features/comments/CommentsBlock";
import SuggestableField from "@/features/suggestions/SuggestableField";
import StoryCircleDiagram from "./StoryCircleDiagram";
import { STORY_CIRCLE_STEPS } from "./steps";
import { createStoryCircleCard, deleteStoryCircleCard } from "./actions";

function CardBody({
  card,
  readOnly,
  suggestions,
}: {
  card: StoryCircleCard;
  readOnly: boolean;
  suggestions: Record<string, string>;
}) {
  const data = (card.data as Record<string, string>) ?? {};
  const [hoverStep, setHoverStep] = useState<number | undefined>(undefined);

  return (
    <div>
      <div className="mb-4">
        <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
          Герой / история
        </label>
        {readOnly ? (
          <p className="heading text-[15px] font-semibold pb-1">{card.hero}</p>
        ) : (
          <SuggestableField
            model="StoryCircleCard"
            recordId={card.id}
            field="hero"
            value={card.hero}
            suggestion={suggestions.hero}
            as="input"
            className="heading w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1"
            style={{ borderColor: "var(--rule)" }}
          />
        )}
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
          <label className="block text-[12.5px] mb-1" style={{ color: "var(--faded)" }}>
            <span className="heading font-semibold" style={{ color: "var(--wine)" }}>
              {step.n}. {step.short}
            </span>{" "}
            — {step.label}
          </label>
          {readOnly ? (
            <p className="text-[13.5px] leading-relaxed pb-1 border-b" style={{ borderColor: "var(--rule)" }}>
              {data[step.key] || <span style={{ color: "var(--faded)" }}>—</span>}
            </p>
          ) : (
            <SuggestableField
              model="StoryCircleCard"
              recordId={card.id}
              field={step.key}
              value={data[step.key] ?? ""}
              suggestion={suggestions[step.key]}
              className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed pb-1 border-b"
              style={{ borderColor: "var(--rule)" }}
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
}: {
  card: StoryCircleCard;
  readOnly: boolean;
  suggestions: Record<string, string>;
  initialComments: Comment[];
  onDelete: (id: string) => void;
}) {
  return (
    <CollapsibleCharacterShell name={card.hero} photoUrl={null}>
      <CardBody card={card} readOnly={readOnly} suggestions={suggestions} />
      {!readOnly && (
        <button
          onClick={() => onDelete(card.id)}
          className="text-[12.5px] px-2.5 py-1.5 rounded-sm mt-4"
          style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
        >
          Удалить
        </button>
      )}
      <CommentsBlock model="StoryCircleCard" recordId={card.id} initialComments={initialComments} />
    </CollapsibleCharacterShell>
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

export function StoryCircleOwnList({
  studentId,
  initialCards,
  suggestions,
  comments,
}: {
  studentId: string;
  initialCards: StoryCircleCard[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();

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
