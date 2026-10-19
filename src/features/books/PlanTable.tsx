"use client";

import { useState, useTransition, useRef, useEffect, type CSSProperties } from "react";
import { Trash2 } from "lucide-react";
import type { PlanChapter } from "@/generated/prisma/client";
import { createPlanChapter, updatePlanChapterNumber, updatePlanChapterColor, toggleChapterActBreak, deletePlanChapter } from "./actions";
import { updatePlanColumnColors } from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { useHeaderAction } from "@/components/headerAction";

const PALETTE = ["#E0CBE7", "#E2E9EE", "#E2EADC", "#F0E1E4"];

function ColorPicker({
  current,
  onChange,
  label,
}: {
  current: string | null;
  onChange: (color: string | null) => void;
  label: string;
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
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={label}
        aria-label={label}
        className="rounded-full border"
        style={{
          width: 14,
          height: 14,
          background: current ?? "transparent",
          borderColor: current ? "transparent" : "var(--border)",
        }}
      />
      {open && (
        <div
          className="absolute top-5 left-0 z-30 flex gap-1.5 p-2 rounded-lg shadow-md"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { onChange(c === current ? null : c); setOpen(false); }}
              className="rounded-full border-2"
              aria-label={label}
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
              type="button"
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
  summary: "Суть",
  dramaticArgument: "Ядро",
  note: "Примечание",
  chars: "Знаки",
};

function formatChars(value: number) {
  return value.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
}

function chapterPercent(chapter: PlanChapter) {
  if (chapter.plannedChars <= 0) return 0;
  return Math.round((chapter.writtenChars / chapter.plannedChars) * 100);
}

function sumChars(chapters: PlanChapter[]) {
  const planned = chapters.reduce((sum, chapter) => sum + (chapter.plannedChars || 0), 0);
  const written = chapters.reduce((sum, chapter) => sum + (chapter.writtenChars || 0), 0);
  const percent = planned > 0 ? Math.round((written / planned) * 100) : 0;
  return { planned, written, percent };
}

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
  const [colorsOpen, setColorsOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const chapter = await createPlanChapter(bookId);
      setChapters((prev) => [...prev, chapter]);
    });
  }
  useHeaderAction("plan-chapter", handleAdd);

  function handleNumber(chapterId: string, field: "plannedChars" | "writtenChars", value: number) {
    const next = Number.isFinite(value) ? value : 0;
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, [field]: next } : c)));
    startTransition(() => updatePlanChapterNumber(chapterId, field, next));
  }

  function handleRowColor(chapterId: string, color: string | null) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, color } : c)));
    startTransition(() => updatePlanChapterColor(chapterId, color));
  }

  function handleDelete(chapterId: string) {
    if (!window.confirm("Удалить главу?")) return;
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    startTransition(() => deletePlanChapter(chapterId));
  }

  function handleActBreak(chapterId: string, value: boolean) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, actBreakAfter: value } : c)));
    startTransition(() => toggleChapterActBreak(chapterId, value));
  }

  function handleColColor(col: string, color: string | null) {
    const next = { ...colColors };
    if (color) next[col] = color;
    else delete next[col];
    setColColors(next);
    startTransition(() => updatePlanColumnColors(bookId, next));
  }

  const totals = sumChars(chapters);
  const groups: { act: number; items: { chapter: PlanChapter; index: number }[] }[] = [{ act: 1, items: [] }];
  chapters.forEach((chapter, index) => {
    groups[groups.length - 1].items.push({ chapter, index });
    if (chapter.actBreakAfter) groups.push({ act: groups.length + 1, items: [] });
  });

  return (
    <div className="chapter-feed">
      <section className="chapter-plaque" aria-label="Сводка по книге">
        <div className="chapter-plaque-row">
          <div>
            <div className="chapter-plaque-num">{formatChars(totals.written)}</div>
            <div className="chapter-plaque-lbl">написано знаков</div>
          </div>
          <div>
            <div className="chapter-plaque-num">{formatChars(totals.planned)}</div>
            <div className="chapter-plaque-lbl">в плане</div>
          </div>
          <div className="chapter-plaque-grow">
            <div className="chapter-plaque-num">{totals.percent}%</div>
            <div className="chapter-plaque-lbl">готово</div>
          </div>
        </div>
        <div className="chapter-track" aria-hidden="true">
          <i style={{ width: `${Math.min(100, totals.percent)}%` }} />
        </div>
      </section>

      <div className="chapter-colors">
        <button type="button" className="chapter-colors-toggle" onClick={() => setColorsOpen((open) => !open)} aria-expanded={colorsOpen}>
          Цвета колонок
        </button>
        {colorsOpen && (
          <div className="chapter-colors-row">
            {COLUMNS.map((col) => (
              <span key={col} className="chapter-colors-item">
                <ColorPicker current={colColors[col] ?? null} onChange={(color) => handleColColor(col, color)} label={`Цвет: ${COL_LABELS[col]}`} />
                {COL_LABELS[col]}
              </span>
            ))}
          </div>
        )}
      </div>

      {chapters.length === 0 ? (
        <p className="chapter-empty">Глав пока нет. Новая глава появится здесь.</p>
      ) : (
        groups.map((group) => {
          const stats = sumChars(group.items.map((item) => item.chapter));
          if (group.items.length === 0) {
            return (
              <div key={`act-${group.act}`} className="chapter-act">Акт {group.act}</div>
            );
          }
          return (
            <section key={`act-${group.act}`}>
              <div className="chapter-act">Акт {group.act} · {stats.percent}%</div>
              {group.items.map(({ chapter, index }) => {
                const percent = chapterPercent(chapter);
                const over = percent > 100;
                const chapterSuggestions = suggestions[chapter.id] ?? {};
                const fieldBg = (col: ColKey): CSSProperties | undefined =>
                  chapter.color ? undefined : colColors[col] ? { background: colColors[col] } : undefined;
                return (
                  <article
                    key={chapter.id}
                    className="chapter-card"
                    style={{ background: chapter.color ?? "#fff" }}
                  >
                    <div className="chapter-card-top">
                      <span className="chapter-card-n">{index + 1}</span>
                      <div className="chapter-card-tools">
                        <ColorPicker
                          current={chapter.color ?? null}
                          onChange={(color) => handleRowColor(chapter.id, color)}
                          label="Цвет главы"
                        />
                        <button
                          type="button"
                          className="chapter-tool"
                          onClick={() => handleActBreak(chapter.id, !chapter.actBreakAfter)}
                          title={chapter.actBreakAfter ? "Убрать границу акта" : "Начать новый акт после этой главы"}
                        >
                          {chapter.actBreakAfter ? "Убрать границу" : "Новый акт"}
                        </button>
                        <button
                          type="button"
                          className="chapter-tool chapter-tool-icon"
                          onClick={() => handleDelete(chapter.id)}
                          title="Удалить главу"
                          aria-label="Удалить главу"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <SuggestableField
                      model="PlanChapter"
                      recordId={chapter.id}
                      field="summary"
                      value={chapter.summary}
                      suggestion={chapterSuggestions.summary}
                      placeholder="Суть по сюжету"
                      className="chapter-card-title"
                      style={fieldBg("summary")}
                    />
                    <SuggestableField
                      model="PlanChapter"
                      recordId={chapter.id}
                      field="dramaticArgument"
                      value={chapter.dramaticArgument}
                      suggestion={chapterSuggestions.dramaticArgument}
                      placeholder="Драматическое ядро"
                      className="chapter-card-core"
                      style={fieldBg("dramaticArgument")}
                    />
                    <SuggestableField
                      model="PlanChapter"
                      recordId={chapter.id}
                      field="note"
                      value={chapter.note}
                      suggestion={chapterSuggestions.note}
                      placeholder="Примечание"
                      className="chapter-card-note"
                      style={fieldBg("note")}
                    />
                    <div className="chapter-card-foot" style={fieldBg("chars")}>
                      <div className="chapter-mini-track" aria-hidden="true">
                        <i style={{ width: `${Math.min(100, percent)}%`, background: over ? "var(--v)" : "var(--ink)" }} />
                      </div>
                      <div className="chapter-card-figures">
                        <input
                          type="number"
                          min={0}
                          defaultValue={chapter.writtenChars || ""}
                          onBlur={(e) => handleNumber(chapter.id, "writtenChars", Number(e.target.value))}
                          onKeyDown={blurOnEnter}
                          aria-label="Написано знаков"
                          placeholder="0"
                          className="chapter-num"
                        />
                        <span aria-hidden="true">/</span>
                        <input
                          type="number"
                          min={0}
                          defaultValue={chapter.plannedChars || ""}
                          onBlur={(e) => handleNumber(chapter.id, "plannedChars", Number(e.target.value))}
                          onKeyDown={blurOnEnter}
                          aria-label="План знаков"
                          placeholder="0"
                          className="chapter-num"
                        />
                        <span className={over ? "chapter-pct is-over" : "chapter-pct"}>
                          {chapter.plannedChars > 0 ? `· ${percent}%` : "· —"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })
      )}
    </div>
  );
}
