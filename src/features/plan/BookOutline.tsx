"use client";

import { useState, useTransition } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { siteConfirm, sitePrompt } from "@/components/SiteDialog";
import {
  createPlanCard,
  createStoryline,
  deletePlanCard,
  deleteStoryline,
  placePlanCard,
  renameStoryline,
  updatePlanCard,
} from "./actions";

export type OutlineLine = { id: string; name: string; color: string; order: number };
export type OutlineCard = {
  id: string;
  storylineId: string;
  actId: string | null;
  planChapterId: string | null;
  order: number;
  title: string;
  body: string;
};
export type OutlineAct = { id: string; title: string; order: number };
export type OutlineChapter = { id: string; title: string; order: number; actId: string | null };

type Mode = "list" | "lanes";

function byOrder<T extends { order: number }>(rows: T[]) {
  return [...rows].sort((a, b) => a.order - b.order);
}

export default function BookOutline({
  bookId,
  initialActs,
  initialChapters,
  initialLines,
  initialCards,
}: {
  bookId: string;
  initialActs: OutlineAct[];
  initialChapters: OutlineChapter[];
  initialLines: OutlineLine[];
  initialCards: OutlineCard[];
}) {
  const [mode, setMode] = useState<Mode>("list");
  const [lines, setLines] = useState(initialLines);
  const [cards, setCards] = useState(initialCards);
  const [lineId, setLineId] = useState(initialLines[0]?.id ?? "");
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const acts = byOrder(initialActs);
  const chapters = byOrder(initialChapters);
  const lineById = new Map(lines.map((line) => [line.id, line]));

  function cardsIn(match: (card: OutlineCard) => boolean) {
    return byOrder(cards.filter(match));
  }

  async function addLine() {
    const name = await sitePrompt("Название ветки", "");
    if (name === null) return;
    const created = await createStoryline(bookId, name);
    setLines((prev) => [...prev, created]);
    setLineId(created.id);
  }

  async function addCard() {
    let line = lines.find((item) => item.id === lineId) ?? lines[0];
    if (!line) {
      const name = await sitePrompt("Сначала название ветки", "");
      if (name === null) return;
      line = await createStoryline(bookId, name);
      setLines((prev) => [...prev, line]);
      setLineId(line.id);
    }
    const title = await sitePrompt("Название события", "");
    if (title === null) return;
    const actId = acts[0]?.id ?? null;
    const created = await createPlanCard(bookId, line.id, actId, title);
    if (created) setCards((prev) => [...prev, created]);
  }

  function move(cardId: string, patch: { storylineId: string; actId: string | null; planChapterId: string | null }, orderedIds: string[]) {
    setCards((prev) => {
      const next = prev.map((card) => (card.id === cardId ? { ...card, ...patch } : card));
      const rank = new Map(orderedIds.map((id, order) => [id, order]));
      return next.map((card) => (rank.has(card.id) ? { ...card, order: rank.get(card.id)! } : card));
    });
    startTransition(() => { void placePlanCard(cardId, patch, orderedIds); });
  }

  function onListDrop(cardId: string, actId: string | null, beforeId: string | null) {
    const moving = cards.find((card) => card.id === cardId);
    if (!moving) return;
    const group = cardsIn((card) => card.actId === actId && card.id !== cardId);
    const ids = group.map((card) => card.id);
    const index = beforeId ? ids.indexOf(beforeId) : ids.length;
    ids.splice(index < 0 ? ids.length : index, 0, cardId);
    move(cardId, { storylineId: moving.storylineId, actId, planChapterId: moving.planChapterId }, ids);
  }

  function onLaneDrop(cardId: string, storylineId: string, planChapterId: string | null) {
    const moving = cards.find((card) => card.id === cardId);
    if (!moving) return;
    const chapter = chapters.find((item) => item.id === planChapterId);
    const actId = chapter?.actId ?? moving.actId;
    const group = cardsIn((card) => card.storylineId === storylineId && card.planChapterId === planChapterId && card.id !== cardId);
    const ids = [...group.map((card) => card.id), cardId];
    move(cardId, { storylineId, actId, planChapterId }, ids);
  }

  const loose = cardsIn((card) => card.actId === null);

  return (
    <div className="plan-outline">
      <div className="plan-outline-bar">
        <div className="plan-switch" role="tablist" aria-label="Вид плана">
          <button type="button" className={mode === "list" ? "is-on" : undefined} aria-pressed={mode === "list"} onClick={() => setMode("list")}>Список</button>
          <button type="button" className={mode === "lanes" ? "is-on" : undefined} aria-pressed={mode === "lanes"} onClick={() => setMode("lanes")}>Лента</button>
        </div>
        <div className="plan-outline-actions">
          <button type="button" className="plan-outline-ghost" onClick={() => void addLine()}>Новая ветка</button>
          {lines.length > 0 ? (
            <label className="plan-line-pick">
              Ветка
              <select aria-label="Ветка для нового события" value={lines.some((item) => item.id === lineId) ? lineId : lines[0].id} onChange={(event) => setLineId(event.target.value)}>
                {byOrder(lines).map((line) => (
                  <option key={line.id} value={line.id}>{line.name || "Ветка"}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" className="btn-y plan-outline-add" onClick={() => void addCard()}><Plus size={16} /> Событие</button>
        </div>
      </div>
      <p className="plan-outline-note">Трекер по главам отсюда не меняется. Столбцы ленты — главы, которые уже есть в трекере.</p>
      {mode === "list" ? (
        <div className="plan-outline-layout">
          <aside>
            <h2>Сюжетные ветки</h2>
            {lines.length === 0 ? <p className="plan-outline-note">Веток пока нет.</p> : null}
            {byOrder(lines).map((line) => (
              <div key={line.id} className="plan-line">
                <i style={{ background: line.color }} />
                <input
                  defaultValue={line.name}
                  aria-label="Название ветки"
                  onBlur={(event) => {
                    const name = event.target.value;
                    setLines((prev) => prev.map((item) => (item.id === line.id ? { ...item, name } : item)));
                    startTransition(() => { void renameStoryline(line.id, name); });
                  }}
                />
                <button
                  type="button"
                  aria-label="Удалить ветку"
                  onClick={() => {
                    void (async () => {
                      if (!(await siteConfirm("Удалить ветку и её события?"))) return;
                      setLines((prev) => prev.filter((item) => item.id !== line.id));
                      setCards((prev) => prev.filter((card) => card.storylineId !== line.id));
                      startTransition(() => { void deleteStoryline(line.id); });
                    })();
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </aside>
          <div>
            {acts.map((act) => (
              <ActList
                key={act.id}
                title={act.title.trim() || "Акт"}
                cards={cardsIn((card) => card.actId === act.id)}
                lines={lineById}
                dragId={dragId}
                onDrag={setDragId}
                onDrop={(beforeId) => dragId && onListDrop(dragId, act.id, beforeId)}
                onTitle={(id, title) => {
                  setCards((prev) => prev.map((card) => (card.id === id ? { ...card, title } : card)));
                  startTransition(() => { void updatePlanCard(id, "title", title); });
                }}
                onBody={(id, body) => {
                  setCards((prev) => prev.map((card) => (card.id === id ? { ...card, body } : card)));
                  startTransition(() => { void updatePlanCard(id, "body", body); });
                }}
                onDelete={(id) => {
                  setCards((prev) => prev.filter((card) => card.id !== id));
                  startTransition(() => { void deletePlanCard(id); });
                }}
              />
            ))}
            <ActList
              title="Без акта"
              cards={loose}
              lines={lineById}
              dragId={dragId}
              onDrag={setDragId}
              onDrop={(beforeId) => dragId && onListDrop(dragId, null, beforeId)}
              onTitle={(id, title) => {
                setCards((prev) => prev.map((card) => (card.id === id ? { ...card, title } : card)));
                startTransition(() => { void updatePlanCard(id, "title", title); });
              }}
              onBody={(id, body) => {
                setCards((prev) => prev.map((card) => (card.id === id ? { ...card, body } : card)));
                startTransition(() => { void updatePlanCard(id, "body", body); });
              }}
              onDelete={(id) => {
                setCards((prev) => prev.filter((card) => card.id !== id));
                startTransition(() => { void deletePlanCard(id); });
              }}
            />
          </div>
        </div>
      ) : (
        <LaneBoard
          lines={byOrder(lines)}
          chapters={chapters}
          cards={cards}
          dragId={dragId}
          onDrag={setDragId}
          onDrop={onLaneDrop}
        />
      )}
    </div>
  );
}

function ActList({
  title,
  cards,
  lines,
  dragId,
  onDrag,
  onDrop,
  onTitle,
  onBody,
  onDelete,
}: {
  title: string;
  cards: OutlineCard[];
  lines: Map<string, OutlineLine>;
  dragId: string | null;
  onDrag: (id: string | null) => void;
  onDrop: (beforeId: string | null) => void;
  onTitle: (id: string, title: string) => void;
  onBody: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section
      className="plan-act"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(null);
      }}
    >
      <h2>{title}</h2>
      {cards.length === 0 ? <p className="plan-outline-note">Перетащите событие сюда.</p> : null}
      {cards.map((card) => {
        const line = lines.get(card.storylineId);
        return (
          <article
            key={card.id}
            className={dragId === card.id ? "plan-card is-lift" : "plan-card"}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDrop(card.id);
            }}
          >
            <button
              type="button"
              className="plan-grip"
              aria-label="Перетащить"
              draggable
              onDragStart={() => onDrag(card.id)}
              onDragEnd={() => onDrag(null)}
            >
              <GripVertical size={16} />
            </button>
            <i style={{ background: line?.color ?? "#2FB083" }} />
            <div>
              <span className="plan-who" style={{ color: line?.color }}>{line?.name || "Ветка"}</span>
              <input
                defaultValue={card.title}
                aria-label="Название события"
                onBlur={(event) => onTitle(card.id, event.target.value)}
              />
              <textarea
                defaultValue={card.body}
                aria-label="Текст события"
                rows={2}
                onBlur={(event) => onBody(card.id, event.target.value)}
              />
            </div>
            <button type="button" className="plan-card-delete" aria-label="Удалить событие" onClick={() => onDelete(card.id)}>
              <Trash2 size={14} />
            </button>
          </article>
        );
      })}
    </section>
  );
}

function LaneBoard({
  lines,
  chapters,
  cards,
  dragId,
  onDrag,
  onDrop,
}: {
  lines: OutlineLine[];
  chapters: OutlineChapter[];
  cards: OutlineCard[];
  dragId: string | null;
  onDrag: (id: string | null) => void;
  onDrop: (cardId: string, storylineId: string, planChapterId: string | null) => void;
}) {
  const columns: { id: string | null; title: string }[] = [
    ...chapters.map((chapter, index) => ({ id: chapter.id, title: chapter.title.trim() || `Глава ${index + 1}` })),
    { id: null, title: "Без главы" },
  ];
  if (lines.length === 0) return <p className="plan-outline-note">Сначала добавьте ветку. Тогда лента нарисует её полосой.</p>;
  return (
    <div className="plan-lanes-scroll">
      <div className="plan-lanes" style={{ gridTemplateColumns: `112px repeat(${columns.length}, minmax(140px, 1fr))` }}>
        <div />
        {columns.map((column) => (
          <div key={column.id ?? "loose"} className="plan-lane-head">{column.title}</div>
        ))}
        {lines.map((line) => (
          <LaneRow key={line.id} line={line} columns={columns} cards={cards} dragId={dragId} onDrag={onDrag} onDrop={onDrop} />
        ))}
      </div>
    </div>
  );
}

function LaneRow({
  line,
  columns,
  cards,
  dragId,
  onDrag,
  onDrop,
}: {
  line: OutlineLine;
  columns: { id: string | null; title: string }[];
  cards: OutlineCard[];
  dragId: string | null;
  onDrag: (id: string | null) => void;
  onDrop: (cardId: string, storylineId: string, planChapterId: string | null) => void;
}) {
  return (
    <>
      <div className="plan-lane-name"><i style={{ background: line.color }} />{line.name}</div>
      {columns.map((column) => {
        const here = byOrder(cards.filter((card) => card.storylineId === line.id && card.planChapterId === column.id));
        return (
          <div
            key={column.id ?? "loose"}
            className="plan-lane-cell"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragId) onDrop(dragId, line.id, column.id);
            }}
          >
            {here.map((card) => (
              <button
                key={card.id}
                type="button"
                className={dragId === card.id ? "plan-lane-card is-lift" : "plan-lane-card"}
                draggable
                style={{ borderLeftColor: line.color }}
                onDragStart={() => onDrag(card.id)}
                onDragEnd={() => onDrag(null)}
              >
                <b>{card.title || "Событие"}</b>
                {card.body ? <span>{card.body}</span> : null}
              </button>
            ))}
          </div>
        );
      })}
    </>
  );
}
