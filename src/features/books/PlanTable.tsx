"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import type { PlanChapter } from "@/generated/prisma/client";
import { createPlanChapter, updatePlanChapterNumber, updatePlanChapterColor } from "./actions";
import { updatePlanColumnColors } from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { Button } from "@/components/ui/Button";

const PALETTE = ["#E0CBE7", "#E2E9EE", "#E2EADC", "#F0E1E4"];

// 5-stop gradient: 0%=dark red, 25%=light red, 50%=orange, 75%=light green, 100%=bright green
function percentCellBackground(percent: number): string {
  const p = Math.max(0, Math.min(100, percent));
  if (p === 0) return "#C0392B22";
  if (p <= 25) {
    const t = p / 25;
    // dark red (#C0392B) → light red (#F1948A)
    const r = Math.round(192 + t * (241 - 192));
    const g = Math.round(57 + t * (148 - 57));
    const b = Math.round(43 + t * (138 - 43));
    return `rgba(${r},${g},${b},0.35)`;
  }
  if (p <= 50) {
    const t = (p - 25) / 25;
    // light red (#F1948A) → orange (#F39C12)
    const r = Math.round(241 + t * (243 - 241));
    const g = Math.round(148 + t * (156 - 148));
    const b = Math.round(138 + t * (18 - 138));
    return `rgba(${r},${g},${b},0.4)`;
  }
  if (p <= 75) {
    const t = (p - 50) / 25;
    // orange (#F39C12) → light green (#82E0AA)
    const r = Math.round(243 + t * (130 - 243));
    const g = Math.round(156 + t * (224 - 156));
    const b = Math.round(18 + t * (170 - 18));
    return `rgba(${r},${g},${b},0.4)`;
  }
  // 75–100: light green → bright green (#27AE60)
  const t = (p - 75) / 25;
  const r = Math.round(130 + t * (39 - 130));
  const g = Math.round(224 + t * (174 - 224));
  const b = Math.round(170 + t * (96 - 170));
  return `rgba(${r},${g},${b},0.5)`;
}

function ColorPicker({
  current,
  onChange,
  align = "left",
}: {
  current: string | null;
  onChange: (color: string | null) => void;
  align?: "left" | "center";
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
    <div ref={ref} className="relative inline-flex items-center justify-center" style={{ width: 20 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Цвет"
        className="rounded-full border transition-opacity hover:opacity-80"
        style={{
          width: 14,
          height: 14,
          background: current ?? "transparent",
          borderColor: current ? "transparent" : "var(--border)",
          flexShrink: 0,
        }}
      />
      {open && (
        <div
          className={`absolute top-5 z-30 flex gap-1.5 p-2 rounded-lg shadow-md ${align === "center" ? "-translate-x-1/2 left-1/2" : "left-0"}`}
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c === current ? null : c); setOpen(false); }}
              className="rounded-full border-2 transition-all"
              style={{
                width: 18,
                height: 18,
                background: c,
                borderColor: c === current ? "var(--ink)" : "transparent",
              }}
            />
          ))}
          {current && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="text-[11px] px-1 rounded"
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

const COLUMNS = ["summary", "dramaticArgument", "note", "chars"] as const;
type ColKey = (typeof COLUMNS)[number];

const COL_LABELS: Record<ColKey, string> = {
  summary: "Суть по сюжету",
  dramaticArgument: "Драм. аргумент",
  note: "Примечание",
  chars: "Знаки",
};

const cellBase: React.CSSProperties = {
  padding: "7px 9px",
  borderRight: "1px solid var(--border)",
  verticalAlign: "top",
};

const headerBase: React.CSSProperties = {
  ...cellBase,
  padding: "5px 9px",
  fontSize: 12,
  color: "var(--ink-faint)",
  fontWeight: 400,
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-surface-2)",
  whiteSpace: "nowrap",
};

export default function PlanTable({
  bookId,
  initialChapters,
  suggestions,
  initialColumnColors,
}: {
  bookId: string;
  initialChapters: PlanChapter[];
  suggestions: Record<string, Record<string, string>>;
  initialColumnColors: Record<string, string>;
}) {
  const [chapters, setChapters] = useState(initialChapters);
  const [colColors, setColColors] = useState<Record<string, string>>(initialColumnColors);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const chapter = await createPlanChapter(bookId);
      setChapters((prev) => [...prev, chapter]);
    });
  }

  function handleNumber(chapterId: string, field: "plannedChars" | "writtenChars", value: number) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, [field]: value } : c)));
    startTransition(() => updatePlanChapterNumber(chapterId, field, value));
  }

  function handleRowColor(chapterId: string, color: string | null) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, color } : c)));
    startTransition(() => updatePlanChapterColor(chapterId, color));
  }

  function handleColColor(col: string, color: string | null) {
    const next = { ...colColors };
    if (color) next[col] = color;
    else delete next[col];
    setColColors(next);
    startTransition(() => updatePlanColumnColors(bookId, next));
  }

  return (
    <div>
      <div className="overflow-x-auto mb-4 rounded-[14px]" style={{ border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 740 }}>
          <colgroup>
            <col style={{ width: 26 }} /> {/* row color */}
            <col style={{ width: 32 }} /> {/* № */}
            <col style={{ width: "25%" }} /> {/* summary */}
            <col style={{ width: "20%" }} /> {/* dramaticArgument */}
            <col style={{ width: "18%" }} /> {/* note */}
            <col style={{ width: 80 }} />  {/* план */}
            <col style={{ width: 80 }} />  {/* написано */}
            <col style={{ width: 56 }} />  {/* % */}
          </colgroup>
          <thead>
            <tr>
              {/* row-color header: empty */}
              <th style={{ ...headerBase, borderRight: "1px solid var(--border)" }} />
              {/* № */}
              <th style={headerBase}>№</th>
              {/* text columns with col color pickers */}
              {(["summary", "dramaticArgument", "note"] as ColKey[]).map((col) => (
                <th key={col} style={{ ...headerBase, background: colColors[col] ?? "var(--bg-surface-2)" }}>
                  <div className="flex items-center gap-1.5">
                    <ColorPicker current={colColors[col] ?? null} onChange={(c) => handleColColor(col, c)} align="left" />
                    {COL_LABELS[col]}
                  </div>
                </th>
              ))}
              {/* chars group header spanning план/написано/% */}
              <th style={{ ...headerBase, background: colColors["chars"] ?? "var(--bg-surface-2)" }}>
                <div className="flex items-center gap-1.5">
                  <ColorPicker current={colColors["chars"] ?? null} onChange={(c) => handleColColor("chars", c)} align="left" />
                  План (зн.)
                </div>
              </th>
              <th style={{ ...headerBase, background: colColors["chars"] ?? "var(--bg-surface-2)" }}>Написано</th>
              <th style={{ ...headerBase, borderRight: "none", background: colColors["chars"] ?? "var(--bg-surface-2)" }}>%</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter, idx) => {
              const percent =
                chapter.plannedChars > 0
                  ? Math.round((chapter.writtenChars / chapter.plannedChars) * 100)
                  : 0;
              const chapterSuggestions = suggestions[chapter.id] ?? {};
              const rowBg = chapter.color ?? undefined;

              function cell(col: ColKey): React.CSSProperties {
                const bg = rowBg ?? colColors[col] ?? undefined;
                return { ...cellBase, borderBottom: "1px solid var(--border)", background: bg };
              }

              return (
                <tr key={chapter.id}>
                  {/* row color picker */}
                  <td style={{ ...cellBase, borderBottom: "1px solid var(--border)", padding: "0 4px", verticalAlign: "middle", background: rowBg }}>
                    <ColorPicker current={chapter.color ?? null} onChange={(c) => handleRowColor(chapter.id, c)} align="left" />
                  </td>
                  {/* № */}
                  <td
                    className="font-mono-label text-center"
                    style={{ ...cell("summary"), fontSize: 12, color: "var(--ink-faint)", verticalAlign: "middle" }}
                  >
                    {idx + 1}
                  </td>
                  {/* summary */}
                  <td style={cell("summary")}>
                    <SuggestableField
                      model="PlanChapter" recordId={chapter.id} field="summary"
                      value={chapter.summary} suggestion={chapterSuggestions.summary}
                      className="w-full min-w-0 outline-none bg-transparent text-[13px] leading-snug"
                    />
                  </td>
                  {/* dramaticArgument */}
                  <td style={cell("dramaticArgument")}>
                    <SuggestableField
                      model="PlanChapter" recordId={chapter.id} field="dramaticArgument"
                      value={chapter.dramaticArgument} suggestion={chapterSuggestions.dramaticArgument}
                      className="w-full min-w-0 outline-none bg-transparent text-[13px] leading-snug"
                    />
                  </td>
                  {/* note */}
                  <td style={cell("note")}>
                    <SuggestableField
                      model="PlanChapter" recordId={chapter.id} field="note"
                      value={chapter.note} suggestion={chapterSuggestions.note}
                      className="w-full min-w-0 outline-none bg-transparent text-[13px] leading-snug"
                    />
                  </td>
                  {/* планируемые знаки */}
                  <td style={{ ...cell("chars"), borderRight: "1px solid var(--border)" }}>
                    <input
                      type="number"
                      defaultValue={chapter.plannedChars || ""}
                      onBlur={(e) => handleNumber(chapter.id, "plannedChars", Number(e.target.value))}
                      onKeyDown={blurOnEnter}
                      placeholder="0"
                      className="w-full min-w-0 outline-none bg-transparent text-[13px] font-mono-label"
                    />
                  </td>
                  {/* написано */}
                  <td style={{ ...cell("chars"), borderRight: "1px solid var(--border)" }}>
                    <input
                      type="number"
                      defaultValue={chapter.writtenChars || ""}
                      onBlur={(e) => handleNumber(chapter.id, "writtenChars", Number(e.target.value))}
                      onKeyDown={blurOnEnter}
                      placeholder="0"
                      className="w-full min-w-0 outline-none bg-transparent text-[13px] font-mono-label"
                    />
                  </td>
                  {/* % */}
                  <td
                    className="font-mono-label text-[12.5px] font-semibold text-center"
                    style={{
                      ...cellBase,
                      borderBottom: "1px solid var(--border)",
                      borderRight: "none",
                      background: percentCellBackground(percent),
                      color: "var(--ink)",
                    }}
                  >
                    {chapter.plannedChars > 0 ? `${percent}%` : "—"}
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
