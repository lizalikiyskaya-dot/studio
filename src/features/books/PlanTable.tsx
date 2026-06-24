"use client";

import { useState, useTransition } from "react";
import type { PlanChapter } from "@/generated/prisma/client";
import { createPlanChapter, updatePlanChapterNumber } from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";

const GRID_COLUMNS = "40px 2fr 2fr 1.6fr 1.4fr 90px 90px 60px";

function percentCellBackground(percent: number) {
  const clamped = Math.max(0, Math.min(100, percent));
  const hue = (clamped / 100) * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 65%, 88%)`;
}

const HEADERS = [
  "№",
  "Суть по сюжету",
  "Драм. аргумент",
  "Важные образы",
  "Примечание",
  "План (зн.)",
  "Написано",
  "%",
];

export default function PlanTable({
  bookId,
  initialChapters,
  suggestions,
}: {
  bookId: string;
  initialChapters: PlanChapter[];
  suggestions: Record<string, Record<string, string>>;
}) {
  const [chapters, setChapters] = useState(initialChapters);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const chapter = await createPlanChapter(bookId);
      setChapters((prev) => [...prev, chapter]);
    });
  }

  function handleNumber(
    chapterId: string,
    field: "plannedChars" | "writtenChars",
    value: number
  ) {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, [field]: value } : c))
    );
    startTransition(() => updatePlanChapterNumber(chapterId, field, value));
  }

  return (
    <div>
      <div className="overflow-x-auto mb-4">
        <div style={{ minWidth: 720 }}>
          <div
            className="grid gap-x-3 pb-2 border-b"
            style={{ gridTemplateColumns: GRID_COLUMNS, borderColor: "var(--rule)" }}
          >
            {HEADERS.map((h) => (
              <div
                key={h}
                className="text-[12px] whitespace-nowrap"
                style={{ color: "var(--faded)" }}
              >
                {h}
              </div>
            ))}
          </div>

          {chapters.map((chapter, idx) => {
            const percent =
              chapter.plannedChars > 0
                ? Math.round((chapter.writtenChars / chapter.plannedChars) * 100)
                : 0;
            const chapterSuggestions = suggestions[chapter.id] ?? {};
            return (
              <div
                key={chapter.id}
                className="grid gap-x-3 py-2.5 border-b items-start"
                style={{ gridTemplateColumns: GRID_COLUMNS, borderColor: "var(--rule)" }}
              >
                <div className="font-mono-label text-[12px] pt-1.5" style={{ color: "var(--faded)" }}>
                  {idx + 1}
                </div>
                <SuggestableField
                  model="PlanChapter"
                  recordId={chapter.id}
                  field="summary"
                  value={chapter.summary}
                  suggestion={chapterSuggestions.summary}
                  className="w-full min-w-0 outline-none bg-transparent text-[13.5px] py-1 leading-snug"
                />
                <SuggestableField
                  model="PlanChapter"
                  recordId={chapter.id}
                  field="dramaticArgument"
                  value={chapter.dramaticArgument}
                  suggestion={chapterSuggestions.dramaticArgument}
                  className="w-full min-w-0 outline-none bg-transparent text-[13.5px] py-1 leading-snug"
                />
                <SuggestableField
                  model="PlanChapter"
                  recordId={chapter.id}
                  field="images"
                  value={chapter.images}
                  suggestion={chapterSuggestions.images}
                  className="w-full min-w-0 outline-none bg-transparent text-[13.5px] py-1 leading-snug"
                />
                <SuggestableField
                  model="PlanChapter"
                  recordId={chapter.id}
                  field="note"
                  value={chapter.note}
                  suggestion={chapterSuggestions.note}
                  className="w-full min-w-0 outline-none bg-transparent text-[13.5px] py-1 leading-snug"
                />
                <input
                  type="number"
                  defaultValue={chapter.plannedChars}
                  onBlur={(e) => handleNumber(chapter.id, "plannedChars", Number(e.target.value))}
                  className="w-full min-w-0 outline-none bg-transparent text-[13px] font-mono-label py-1"
                />
                <input
                  type="number"
                  defaultValue={chapter.writtenChars}
                  onBlur={(e) => handleNumber(chapter.id, "writtenChars", Number(e.target.value))}
                  className="w-full min-w-0 outline-none bg-transparent text-[13px] font-mono-label py-1"
                />
                <div
                  className="font-mono-label text-[12.5px] font-semibold text-center py-1.5 rounded-sm"
                  style={{ background: percentCellBackground(percent), color: "var(--ink)" }}
                >
                  {percent}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="text-[12.5px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + глава
      </button>
    </div>
  );
}
