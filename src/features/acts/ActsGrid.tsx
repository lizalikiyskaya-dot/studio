"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { Act, ActChapter, StorylineBlock, Comment } from "@/generated/prisma/client";
import {
  createAct,
  deleteAct,
  createActChapter,
  updateActChapterField,
  deleteActChapter,
  createStorylineBlock,
  updateStorylineBlockField,
  updateStorylineBlockColor,
  deleteStorylineBlock,
  moveStorylineBlock,
  type StorylineColor,
} from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { Button } from "@/components/ui/Button";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { blurOnEnter } from "@/lib/blurOnEnter";

type ChapterWithBlocks = ActChapter & { blocks: StorylineBlock[] };
type ActWithChapters = Act & { chapters: ChapterWithBlocks[] };

const COLOR_OPTIONS: { value: StorylineColor; bg: string }[] = [
  { value: "pink", bg: "#F7D6DE" },
  { value: "ochre", bg: "#F0DDB0" },
  { value: "blue", bg: "#CFE3F0" },
  { value: "lavender", bg: "#DCD3F0" },
  { value: "sage", bg: "#D7E8DB" },
];
const COLOR_BG: Record<string, string> = Object.fromEntries(COLOR_OPTIONS.map((c) => [c.value, c.bg]));

function StorylineBlockCard({
  block,
  onUpdateField,
  onUpdateColor,
  onDelete,
}: {
  block: StorylineBlock;
  onUpdateField: (field: "name" | "description", value: string) => void;
  onUpdateColor: (color: StorylineColor) => void;
  onDelete: () => void;
}) {
  // Disable dragging while editing so "cut" works in the fields (Chromium
  // blocks cut inside draggable elements, though copy still works).
  const [dragOn, setDragOn] = useState(true);
  return (
    <div
      draggable={dragOn}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", block.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onFocusCapture={() => setDragOn(false)}
      onBlurCapture={() => setDragOn(true)}
      className="rounded-md p-3 cursor-grab"
      style={{ background: COLOR_BG[block.color] ?? COLOR_BG.pink, width: 200 }}
    >
      <div className="flex justify-between items-start gap-1 mb-1.5">
        <input
          defaultValue={block.name}
          onBlur={(e) => onUpdateField("name", e.target.value)}
          onKeyDown={blurOnEnter}
          placeholder="Название линии"
          className="heading flex-1 min-w-0 outline-none bg-transparent text-[13.5px] font-semibold"
        />
        <button onClick={onDelete} className="flex-shrink-0" style={{ color: "var(--ink-soft)" }}>
          <X size={12} />
        </button>
      </div>
      <AutoGrowTextarea
        defaultValue={block.description}
        onBlur={(v) => onUpdateField("description", v)}
        placeholder="Описание сюжетной линии"
        className="w-full outline-none bg-transparent text-[12px] leading-snug"
        style={{ color: "var(--ink-soft)" }}
      />
      <div className="flex gap-1 mt-1.5">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.value}
            onClick={() => onUpdateColor(c.value)}
            className="rounded-full"
            style={{
              width: 13,
              height: 13,
              background: c.bg,
              border: block.color === c.value ? "2px solid var(--ink)" : "1px solid rgba(0,0,0,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ChapterRow({
  chapter,
  onUpdateField,
  onDelete,
  onAddBlock,
  onUpdateBlockField,
  onUpdateBlockColor,
  onDeleteBlock,
  onDropBlock,
  isDragOver,
  onDragOverChange,
}: {
  chapter: ChapterWithBlocks;
  onUpdateField: (field: "title" | "description", value: string) => void;
  onDelete: () => void;
  onAddBlock: () => void;
  onUpdateBlockField: (blockId: string, field: "name" | "description", value: string) => void;
  onUpdateBlockColor: (blockId: string, color: StorylineColor) => void;
  onDeleteBlock: (blockId: string) => void;
  onDropBlock: (blockId: string) => void;
  isDragOver: boolean;
  onDragOverChange: (over: boolean) => void;
}) {
  return (
    <div className="rounded-md p-3 mb-2.5" style={{ border: "1px solid var(--rule)" }}>
      <div className="flex justify-between items-start gap-2 mb-2">
        <input
          defaultValue={chapter.title}
          onBlur={(e) => onUpdateField("title", e.target.value)}
          onKeyDown={blurOnEnter}
          className="heading flex-1 min-w-0 outline-none bg-transparent text-[14px] font-semibold"
        />
        <button onClick={onDelete} className="flex-shrink-0" style={{ color: "var(--wine)" }}>
          <X size={12} />
        </button>
      </div>
      <AutoGrowTextarea
        defaultValue={chapter.description}
        placeholder="О чём эта глава..."
        onBlur={(v) => onUpdateField("description", v)}
        className="w-full outline-none bg-transparent text-[13px] leading-relaxed mb-3"
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          onDragOverChange(true);
        }}
        onDragLeave={() => onDragOverChange(false)}
        onDrop={(e) => {
          e.preventDefault();
          onDragOverChange(false);
          const blockId = e.dataTransfer.getData("text/plain");
          if (blockId) onDropBlock(blockId);
        }}
        className="flex gap-2.5 flex-wrap p-2 rounded-md"
        style={{
          border: isDragOver ? "1px dashed var(--wine)" : "1px dashed transparent",
          background: isDragOver ? "var(--paper)" : undefined,
          minHeight: 60,
        }}
      >
        {chapter.blocks.map((block) => (
          <StorylineBlockCard
            key={block.id}
            block={block}
            onUpdateField={(field, value) => onUpdateBlockField(block.id, field, value)}
            onUpdateColor={(color) => onUpdateBlockColor(block.id, color)}
            onDelete={() => onDeleteBlock(block.id)}
          />
        ))}
        <button
          onClick={onAddBlock}
          className="rounded-md flex items-center justify-center text-[12px] flex-shrink-0"
          style={{ border: "1px dashed var(--rule)", color: "var(--faded)", width: 200, minHeight: 60 }}
        >
          + линия
        </button>
      </div>
    </div>
  );
}

export default function ActsGrid({
  bookId,
  initialActs,
  suggestions,
  comments,
}: {
  bookId: string;
  initialActs: ActWithChapters[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
}) {
  const [acts, setActs] = useState(initialActs);
  const [dragOverChapter, setDragOverChapter] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAddAct() {
    startTransition(async () => {
      const act = await createAct(bookId);
      setActs((prev) => [...prev, { ...act, chapters: [] }]);
    });
  }

  function handleDeleteAct(actId: string) {
    if (!window.confirm("Удалить акт?")) return;
    setActs((prev) => prev.filter((a) => a.id !== actId));
    startTransition(() => deleteAct(actId));
  }

  function handleAddChapter(actId: string) {
    startTransition(async () => {
      const chapter = await createActChapter(actId);
      setActs((prev) =>
        prev.map((a) => (a.id === actId ? { ...a, chapters: [...a.chapters, chapter] } : a))
      );
    });
  }

  function handleDeleteChapter(actId: string, chapterId: string) {
    if (!window.confirm("Удалить главу?")) return;
    setActs((prev) =>
      prev.map((a) =>
        a.id === actId ? { ...a, chapters: a.chapters.filter((c) => c.id !== chapterId) } : a
      )
    );
    startTransition(() => deleteActChapter(chapterId));
  }

  function handleChapterField(actId: string, chapterId: string, field: "title" | "description", value: string) {
    setActs((prev) =>
      prev.map((a) =>
        a.id !== actId
          ? a
          : {
              ...a,
              chapters: a.chapters.map((c) => (c.id === chapterId ? { ...c, [field]: value } : c)),
            }
      )
    );
    startTransition(() => updateActChapterField(chapterId, field, value));
  }

  function handleAddBlock(actId: string, chapterId: string) {
    startTransition(async () => {
      const block = await createStorylineBlock(chapterId);
      setActs((prev) =>
        prev.map((a) =>
          a.id !== actId
            ? a
            : {
                ...a,
                chapters: a.chapters.map((c) =>
                  c.id === chapterId ? { ...c, blocks: [...c.blocks, block] } : c
                ),
              }
        )
      );
    });
  }

  function handleBlockField(
    actId: string,
    chapterId: string,
    blockId: string,
    field: "name" | "description",
    value: string
  ) {
    setActs((prev) =>
      prev.map((a) =>
        a.id !== actId
          ? a
          : {
              ...a,
              chapters: a.chapters.map((c) =>
                c.id !== chapterId
                  ? c
                  : { ...c, blocks: c.blocks.map((b) => (b.id === blockId ? { ...b, [field]: value } : b)) }
              ),
            }
      )
    );
    startTransition(() => updateStorylineBlockField(blockId, field, value));
  }

  function handleBlockColor(actId: string, chapterId: string, blockId: string, color: StorylineColor) {
    setActs((prev) =>
      prev.map((a) =>
        a.id !== actId
          ? a
          : {
              ...a,
              chapters: a.chapters.map((c) =>
                c.id !== chapterId
                  ? c
                  : { ...c, blocks: c.blocks.map((b) => (b.id === blockId ? { ...b, color } : b)) }
              ),
            }
      )
    );
    startTransition(() => updateStorylineBlockColor(blockId, color));
  }

  function handleDeleteBlock(actId: string, chapterId: string, blockId: string) {
    setActs((prev) =>
      prev.map((a) =>
        a.id !== actId
          ? a
          : {
              ...a,
              chapters: a.chapters.map((c) =>
                c.id !== chapterId ? c : { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) }
              ),
            }
      )
    );
    startTransition(() => deleteStorylineBlock(blockId));
  }

  function handleDropBlock(targetActId: string, targetChapterId: string, blockId: string) {
    setActs((prev) => {
      let moved: StorylineBlock | undefined;
      const removed = prev.map((a) => ({
        ...a,
        chapters: a.chapters.map((c) => {
          const found = c.blocks.find((b) => b.id === blockId);
          if (found) moved = found;
          return { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) };
        }),
      }));
      if (!moved) return prev;
      return removed.map((a) =>
        a.id !== targetActId
          ? a
          : {
              ...a,
              chapters: a.chapters.map((c) =>
                c.id === targetChapterId ? { ...c, blocks: [...c.blocks, moved!] } : c
              ),
            }
      );
    });
    startTransition(() => moveStorylineBlock(blockId, targetChapterId));
  }

  return (
    <div className="mb-4">
      {acts.map((act) => {
        const actSuggestions = suggestions[act.id] ?? {};
        return (
          <div key={act.id} className="rounded-md p-4 mb-4" style={{ border: "1px solid var(--rule)" }}>
            <div className="flex justify-between items-start mb-1">
              <SuggestableField
                model="Act"
                recordId={act.id}
                field="title"
                value={act.title}
                suggestion={actSuggestions.title}
                as="input"
                className="heading font-semibold text-[18px] outline-none bg-transparent flex-1"
              />
              <button
                onClick={() => handleDeleteAct(act.id)}
                className="text-[12.5px]"
                style={{ color: "var(--wine)" }}
              >
                Удалить акт
              </button>
            </div>
            <SuggestableField
              model="Act"
              recordId={act.id}
              field="subtitle"
              value={act.subtitle}
              suggestion={actSuggestions.subtitle}
              as="input"
              placeholder="завязка / развитие / развязка"
              className="text-[12.5px] outline-none bg-transparent mb-2.5 w-full"
              style={{ color: "var(--faded)" }}
            />
            <SuggestableField
              model="Act"
              recordId={act.id}
              field="content"
              value={act.content}
              suggestion={actSuggestions.content}
              placeholder="Общее описание акта — если не хочешь расписывать по главам и сюжетным линиям"
              className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed mb-3"
            />

            {act.chapters.map((chapter) => (
              <ChapterRow
                key={chapter.id}
                chapter={chapter}
                onUpdateField={(field, value) => handleChapterField(act.id, chapter.id, field, value)}
                onDelete={() => handleDeleteChapter(act.id, chapter.id)}
                onAddBlock={() => handleAddBlock(act.id, chapter.id)}
                onUpdateBlockField={(blockId, field, value) =>
                  handleBlockField(act.id, chapter.id, blockId, field, value)
                }
                onUpdateBlockColor={(blockId, color) => handleBlockColor(act.id, chapter.id, blockId, color)}
                onDeleteBlock={(blockId) => handleDeleteBlock(act.id, chapter.id, blockId)}
                onDropBlock={(blockId) => handleDropBlock(act.id, chapter.id, blockId)}
                isDragOver={dragOverChapter === chapter.id}
                onDragOverChange={(over) => setDragOverChapter(over ? chapter.id : null)}
              />
            ))}

            <Button
              onClick={() => handleAddChapter(act.id)}
              variant="success-outline"
              size="sm"
              style={{ borderStyle: "dashed" }}
            >
              + глава
            </Button>
            <CommentsBlock model="Act" recordId={act.id} initialComments={comments[act.id] ?? []} />
          </div>
        );
      })}

      <button
        onClick={handleAddAct}
        className="rounded-md flex items-center justify-center text-[13px] w-full"
        style={{ border: "1px dashed var(--rule)", color: "var(--faded)", minHeight: 70 }}
      >
        + добавить акт
      </button>
    </div>
  );
}
