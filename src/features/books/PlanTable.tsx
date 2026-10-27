"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useState, useTransition, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import type { PlanChapter } from "@/generated/prisma/client";
import { createPlanChapter, updatePlanChapterNumber, updatePlanChapterColor, updatePlanChapterReview, toggleChapterActBreak, deletePlanChapter } from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { useHeaderAction } from "@/components/headerAction";
import { formatChars, parseChars, progressPercent } from "@/features/acts/chapterText";
import ChapterSide, { type ChapterWeeklyCard } from "./ChapterSide";
import { CHAPTER_REVIEW, chapterReviewLabel, chapterTone, type ChapterReviewValue } from "./chapterReview";

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

const TONE_LEGEND = [
  { tone: "progress", label: "в процессе" },
  { tone: "almost", label: "почти написана" },
  { tone: "review", label: "сдана и на проверке" },
  { tone: "revision", label: "на доработке" },
  { tone: "accepted", label: "принята" },
] as const;

function noteIsLong(note: string) {
  const text = note.trim();
  return text.length > 90 || text.includes("\n");
}

function ChapterNote({ chapter, suggestion }: { chapter: PlanChapter; suggestion?: string }) {
  const long = noteIsLong(chapter.note);
  const [open, setOpen] = useState(false);
  if (suggestion || !long || open) {
    return (
      <div className="chapter-note">
        <SuggestableField
          model="PlanChapter"
          recordId={chapter.id}
          field="note"
          value={chapter.note}
          suggestion={suggestion}
          placeholder="заметка"
          className="chapter-row-note"
          ariaLabel="Заметка к главе"
        />
        {long && !suggestion && (
          <button type="button" className="chapter-note-more" onClick={() => setOpen(false)}>Свернуть</button>
        )}
      </div>
    );
  }
  return (
    <div className="chapter-note">
      <p className="chapter-note-clamp">{chapter.note.trim()}</p>
      <button type="button" className="chapter-note-more" onClick={() => setOpen(true)}>Показать полностью</button>
    </div>
  );
}


function sumChars(chapters: PlanChapter[]) {
  const planned = chapters.reduce((sum, chapter) => sum + (chapter.plannedChars || 0), 0);
  const written = chapters.reduce((sum, chapter) => sum + (chapter.writtenChars || 0), 0);
  return { planned, written, percent: progressPercent(written, planned) };
}

type ActSlice = { id: string; title: string; order: number };

export default function PlanTable({
  bookId,
  initialChapters,
  initialActs,
  suggestions,
  canReview = false,
  weekly = null,
  weeklyHref = "/dashboard/weekly",
}: {
  bookId: string;
  initialChapters: PlanChapter[];
  initialActs: ActSlice[];
  suggestions: Record<string, Record<string, string>>;
  canReview?: boolean;
  weekly?: ChapterWeeklyCard;
  weeklyHref?: string;
}) {
  const [chapters, setChapters] = useState(initialChapters);
  const [acts, setActs] = useState(initialActs);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const { chapter, act } = await createPlanChapter(bookId);
      if (act) setActs((prev) => [...prev, act]);
      setChapters((prev) => [...prev, chapter]);
    });
  }
  useHeaderAction("plan-chapter", handleAdd);

  function handleNumber(chapterId: string, field: "plannedChars" | "writtenChars", value: number) {
    const next = Number.isFinite(value) ? value : 0;
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, [field]: next } : c)));
    startTransition(() => updatePlanChapterNumber(chapterId, field, next));
  }

  function handleReview(chapterId: string, status: ChapterReviewValue) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, reviewStatus: status } : c)));
    startTransition(() => updatePlanChapterReview(chapterId, status));
  }

  function handleRowColor(chapterId: string, color: string | null) {
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, color } : c)));
    startTransition(() => updatePlanChapterColor(chapterId, color));
  }

  async function handleDelete(chapterId: string) {
    if (!(await siteConfirm("Удалить главу?"))) return;
    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
    startTransition(() => deletePlanChapter(chapterId));
  }

  function handleActBreak(chapterId: string, value: boolean) {
    startTransition(async () => {
      const next = await toggleChapterActBreak(chapterId, value);
      setChapters(next.chapters);
      setActs(next.acts);
    });
  }

  const totals = sumChars(chapters);
  const numbers = new Map(chapters.map((chapter, index) => [chapter.id, index + 1]));
  const grouped = new Map<string, PlanChapter[]>();
  for (const chapter of chapters) {
    const key = chapter.actId ?? "";
    const list = grouped.get(key) ?? [];
    list.push(chapter);
    grouped.set(key, list);
  }
  const groups = acts.map((act, index) => ({
    key: act.id,
    label: act.title.trim() || `Акт ${index + 1}`,
    items: grouped.get(act.id) ?? [],
  })).filter((group) => group.items.length > 0);
  const loose = grouped.get("") ?? [];
  if (loose.length > 0) groups.push({ key: "loose", label: "Ещё", items: loose });

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

      <div className="chapter-legend" aria-label="Статусы глав">
        {TONE_LEGEND.map((item) => (
          <span key={item.tone}>
            <i className={`is-${item.tone}`} />
            {item.label}
          </span>
        ))}
      </div>

      <div className={weekly ? "chapter-layout" : undefined}>
        {weekly ? <ChapterSide weekly={weekly} weeklyHref={weeklyHref} /> : null}
        <div className="chapter-main">
          {chapters.length === 0 ? (
            <p className="chapter-empty">Глав пока нет.</p>
          ) : (
            groups.map((group) => {
              const stats = sumChars(group.items);
              return (
                <section key={group.key}>
                  <div className="chapter-act">{group.label} · {stats.percent}%</div>
                  <div className="chapter-list">
                  {group.items.map((chapter, index) => {
                    const status = chapter.reviewStatus ?? "IN_PROGRESS";
                    const tone = chapterTone(status, chapter.writtenChars, chapter.plannedChars);
                    const percent = progressPercent(chapter.writtenChars, chapter.plannedChars);
                    const chapterSuggestions = suggestions[chapter.id] ?? {};
                    return (
                      <article
                        key={chapter.id}
                        id={`chapter-${chapter.id}`}
                        className={`chapter-card is-${tone}`}
                        style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                      >
                        <div className="chapter-card-top">
                          <span className="chapter-card-n">Глава {numbers.get(chapter.id)}</span>
                          {canReview ? (
                            <select
                              className={`chapter-status chapter-status-select is-${tone}`}
                              value={status}
                              aria-label="Статус главы"
                              onChange={(event) => {
                                const next = event.target.value;
                                if (next === "IN_PROGRESS" || next === "SUBMITTED" || next === "IN_REVIEW" || next === "NEEDS_REVISION" || next === "ACCEPTED") {
                                  handleReview(chapter.id, next);
                                }
                              }}
                            >
                              {CHAPTER_REVIEW.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`chapter-status is-${tone}`}>{chapterReviewLabel(status)}</span>
                          )}
                        </div>
                        <SuggestableField
                          model="PlanChapter"
                          recordId={chapter.id}
                          field="title"
                          value={chapter.title}
                          suggestion={chapterSuggestions.title}
                          placeholder="Название"
                          className="chapter-card-title"
                          ariaLabel="Название главы"
                        />
                        <ChapterNote chapter={chapter} suggestion={chapterSuggestions.note} />
                        <div className="chapter-card-foot">
                          <div className="chapter-card-figures">
                            <input
                              key={`${chapter.id}-w-${chapter.writtenChars}`}
                              defaultValue={formatChars(chapter.writtenChars)}
                              onBlur={(e) => handleNumber(chapter.id, "writtenChars", parseChars(e.target.value))}
                              onKeyDown={blurOnEnter}
                              inputMode="numeric"
                              aria-label="Написано знаков"
                              placeholder="0"
                              className="chapter-num"
                              size={Math.max(1, formatChars(chapter.writtenChars).length)}
                            />
                            <span aria-hidden="true">/</span>
                            <input
                              key={`${chapter.id}-p-${chapter.plannedChars}`}
                              defaultValue={formatChars(chapter.plannedChars)}
                              onBlur={(e) => handleNumber(chapter.id, "plannedChars", parseChars(e.target.value))}
                              onKeyDown={blurOnEnter}
                              inputMode="numeric"
                              aria-label="План знаков"
                              placeholder="0"
                              className="chapter-num"
                              size={Math.max(1, formatChars(chapter.plannedChars).length)}
                            />
                            <span className="chapter-pct">{chapter.plannedChars > 0 ? `${percent}%` : "—"}</span>
                          </div>
                          <div className="chapter-mini-track" aria-hidden="true">
                            <i style={{ width: `${Math.min(100, percent)}%` }} />
                          </div>
                        </div>
                        <div className="chapter-card-tools">
                          <ColorPicker
                            current={chapter.color ?? null}
                            onChange={(color) => handleRowColor(chapter.id, color)}
                            label="Цвет главы"
                          />
                          <button
                            type="button"
                            className={chapter.actBreakAfter ? "chapter-tool act-break is-on" : "chapter-tool act-break"}
                            onClick={() => handleActBreak(chapter.id, !chapter.actBreakAfter)}
                          >
                            {chapter.actBreakAfter ? "Убрать границу" : "Граница"}
                          </button>
                          <button
                            type="button"
                            className="chapter-tool chapter-tool-icon"
                            onClick={() => handleDelete(chapter.id)}
                            aria-label="Удалить главу"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
