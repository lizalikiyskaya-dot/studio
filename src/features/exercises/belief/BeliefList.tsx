"use client";

import { useState, useTransition } from "react";
import type { BeliefCard } from "@/generated/prisma/client";
import CollapsibleCharacterShell from "@/components/CollapsibleCharacterShell";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { createBeliefCard, deleteBeliefCard } from "./actions";

function CardBody({
  card,
  readOnly,
  suggestable,
  suggestions,
}: {
  card: BeliefCard;
  readOnly: boolean;
  suggestable: boolean;
  suggestions: Record<string, string>;
}) {
  return (
    <div>
      <div className="mb-3">
        <label className="block font-mono-label text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--faded)" }}>
          Герой
        </label>
        {readOnly ? (
          <p className="text-[15px] font-semibold pb-1">{card.hero}</p>
        ) : (
          <SuggestableField
            model="BeliefCard"
            recordId={card.id}
            field="hero"
            value={card.hero}
            suggestion={suggestions.hero}
            as="input"
            className="w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1"
            style={{ borderColor: "var(--rule)" }}
          />
        )}
      </div>
      <div className="mb-3">
        <label className="block font-mono-label text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--faded)" }}>
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
        <label className="block font-mono-label text-[9px] uppercase tracking-wide mb-1" style={{ color: "var(--faded)" }}>
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
  onDelete,
}: {
  card: BeliefCard;
  readOnly: boolean;
  suggestable: boolean;
  suggestions: Record<string, string>;
  onDelete: (id: string) => void;
}) {
  return (
    <CollapsibleCharacterShell name={card.hero} photoUrl={null}>
      <CardBody card={card} readOnly={readOnly} suggestable={suggestable} suggestions={suggestions} />
      {!readOnly && (
        <button
          onClick={() => onDelete(card.id)}
          className="font-mono-label text-[10px] px-2.5 py-1.5 rounded-sm mt-4"
          style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
        >
          Удалить
        </button>
      )}
    </CollapsibleCharacterShell>
  );
}

export function BeliefExamplesList({
  studentId,
  initialCards,
  isMentorViewer,
}: {
  studentId: string;
  initialCards: BeliefCard[];
  isMentorViewer: boolean;
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();

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

  return (
    <div>
      {cards.map((card) => (
        <CardShell
          key={card.id}
          card={card}
          readOnly={!isMentorViewer}
          suggestable={false}
          suggestions={{}}
          onDelete={handleDelete}
        />
      ))}
      {isMentorViewer && (
        <button
          onClick={handleAdd}
          className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
          style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
        >
          + добавить пример
        </button>
      )}
    </div>
  );
}

export function BeliefOwnList({
  studentId,
  initialCards,
  suggestions,
}: {
  studentId: string;
  initialCards: BeliefCard[];
  suggestions: Record<string, Record<string, string>>;
}) {
  const [cards, setCards] = useState(initialCards);
  const [, startTransition] = useTransition();

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

  return (
    <div>
      {cards.map((card) => (
        <CardShell
          key={card.id}
          card={card}
          readOnly={false}
          suggestable
          suggestions={suggestions[card.id] ?? {}}
          onDelete={handleDelete}
        />
      ))}
      <button
        onClick={handleAdd}
        className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + добавить героя
      </button>
    </div>
  );
}
