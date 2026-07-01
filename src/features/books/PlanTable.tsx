"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import type { PlanChapter } from "@/generated/prisma/client";
import { createPlanChapter, updatePlanChapterNumber, updatePlanChapterColor } from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { Button } from "@/components/ui/Button";

const PALETTE = ["#E0CBE7", "#E2E9EE", "#E2EADC", "#F0E1E4"];

function ColorPicker({
  current,
  onChange,
}: {
  current: string | null;
  onChange: (color: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center justify-center" style={{ width: 28 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Цвет строки"
        className="rounded-full border transition-opacity hover:opacity-80"
        style={{
          width: 16,
          height: 16,
          background: current ?? "transparent",
          borderColor: current ? "transparent" : "var(--border)",
          flexShrink: 0,
        }}
      />
      {open && (
        <div
          className="absolute left-5 top-0 z-20 flex gap-1.5 p-2 rounded-lg shadow-md"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c === current ? null : c); setOpen(false); }}
              className="rounded-full border-2 transition-all"
              style={{
                width: 20,
                height: 20,
                background: c,
                borderColor: c === current ? "var(--ink)" : "transparent",
              }}
            />
          ))}
          {current && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="text-[11px] px-1.5 rounded"
              style={{ color: "var(--ink-faint)", border: "1px solid var(--border)" }}
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRight: "1px solid var(--border)",
  verticalAlign: "top",
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  padding: "6px 10px",
  fontSize: 12,
  color: "var(--ink-faint)",
  fontWeight: 400,
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-surface-2)",
};

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

  function handleColor(chapterId: string, color: string | null) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, color } : c)));
    startTransition(() => updatePlanChapterColor(chapterId, color));
  }

  return (
    <div>
      <div className="overflow-x-auto mb-4 rounded-[14px]" style={{ border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <colgroup>
            <col style={{ width: 28 }} />
            <col style={{ width: 36 }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "30%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, borderRight: "1px solid var(--border)" }} />
              <th style={headerCellStyle}>гл.</th>
              <th style={headerCellStyle}>Суть по сюжету</th>
              <th style={headerCellStyle}>Драматическое ядро</th>
              <th style={{ ...headerCellStyle, borderRight: "none" }}>Примечание</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter, idx) => {
              const chapterSuggestions = suggestions[chapter.id] ?? {};
              const rowBg = chapter.color ?? "transparent";
              return (
                <tr key={chapter.id} style={{ background: rowBg }}>
                  <td style={{ ...cellStyle, borderBottom: "1px solid var(--border)", padding: "0 6px", verticalAlign: "middle" }}>
                    <ColorPicker
                      current={chapter.color ?? null}
                      onChange={(c) => handleColor(chapter.id, c)}
                    />
                  </td>
                  <td
                    className="font-mono-label text-center"
                    style={{ ...cellStyle, borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--ink-faint)", verticalAlign: "middle" }}
                  >
                    {idx + 1}
                  </td>
                  <td style={{ ...cellStyle, borderBottom: "1px solid var(--border)" }}>
                    <SuggestableField
                      model="PlanChapter"
                      recordId={chapter.id}
                      field="summary"
                      value={chapter.summary}
                      suggestion={chapterSuggestions.summary}
                      className="w-full min-w-0 outline-none bg-transparent text-[13.5px] leading-snug"
                    />
                  </td>
                  <td style={{ ...cellStyle, borderBottom: "1px solid var(--border)" }}>
                    <SuggestableField
                      model="PlanChapter"
                      recordId={chapter.id}
                      field="dramaticArgument"
                      value={chapter.dramaticArgument}
                      suggestion={chapterSuggestions.dramaticArgument}
                      className="w-full min-w-0 outline-none bg-transparent text-[13.5px] leading-snug"
                    />
                  </td>
                  <td style={{ ...cellStyle, borderBottom: "1px solid var(--border)", borderRight: "none" }}>
                    <SuggestableField
                      model="PlanChapter"
                      recordId={chapter.id}
                      field="note"
                      value={chapter.note}
                      suggestion={chapterSuggestions.note}
                      className="w-full min-w-0 outline-none bg-transparent text-[13.5px] leading-snug"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={handleAdd} variant="dashed" size="sm" pill>
        + глава
      </Button>
    </div>
  );
}
