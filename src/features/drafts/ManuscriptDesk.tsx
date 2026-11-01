"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import WritingEditor from "@/features/exercises/additional/WritingEditor";
import type { ContentFormat } from "@/features/exercises/additional/richText";
import { formatChars } from "@/features/acts/chapterText";
import { countSigns } from "./manuscriptCount";
import { createManuscriptChapter, renameManuscriptChapter, saveManuscriptChapter } from "./actions";

export type ManuscriptChapter = {
  id: string;
  title: string;
  order: number;
  plannedChars: number;
  writtenChars: number;
  writtenHere: boolean;
  manuscript: string;
  manuscriptFormat: string;
};

function asFormat(value: string): ContentFormat {
  return value === "markdown" ? "markdown" : "plain";
}

const THEMES = [
  { id: "white", label: "Белая" },
  { id: "paper", label: "Бумага" },
  { id: "dark", label: "Тёмная" },
] as const;

type Theme = (typeof THEMES)[number]["id"];

function themeKey(viewerId: string) {
  return `manuscript-theme:${viewerId}`;
}

function readTheme(viewerId: string): Theme {
  try {
    const saved = localStorage.getItem(themeKey(viewerId));
    if (saved === "paper" || saved === "dark" || saved === "white") return saved;
  } catch {
    // Хранилище недоступно: остаётся белая тема.
  }
  return "white";
}

function ThemeSwitch({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  return (
    <span className="manuscript-themes" role="group" aria-label="Тема окна">
      {THEMES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === theme ? "is-on" : undefined}
          aria-pressed={item.id === theme}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </span>
  );
}

export default function ManuscriptDesk({
  bookId,
  bookTitle,
  initialChapters,
  viewerId,
  readOnly,
}: {
  bookId: string | null;
  bookTitle: string;
  initialChapters: ManuscriptChapter[];
  viewerId: string;
  readOnly: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("white");
  const [chapters, setChapters] = useState(initialChapters);
  const [currentId, setCurrentId] = useState(initialChapters[0]?.id ?? null);
  const [status, setStatus] = useState<"saved" | "saving">("saved");
  const timer = useRef<number | null>(null);
  const latest = useRef<{ id: string; content: string; format: ContentFormat } | null>(null);

  useEffect(() => {
    setTheme(readTheme(viewerId));
  }, [viewerId]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "white") root.removeAttribute("data-manuscript-theme");
    else root.setAttribute("data-manuscript-theme", theme);
    return () => root.removeAttribute("data-manuscript-theme");
  }, [theme]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(themeKey(viewerId), next);
    } catch {
      // Выбор останется до перезагрузки страницы.
    }
  }

  const current = chapters.find((chapter) => chapter.id === currentId) ?? null;
  const written = chapters.reduce((sum, chapter) => sum + (chapter.writtenChars || 0), 0);
  const planned = chapters.reduce((sum, chapter) => sum + (chapter.plannedChars || 0), 0);

  async function flush() {
    const snap = latest.current;
    if (!snap || readOnly) return;
    const result = await saveManuscriptChapter(snap.id, snap.content, snap.format);
    if (result) setStatus("saved");
  }

  function select(id: string) {
    if (timer.current) window.clearTimeout(timer.current);
    void flush();
    setCurrentId(id);
    setStatus("saved");
  }

  function onChange(content: string, format: ContentFormat) {
    if (!current || readOnly) return;
    const signs = countSigns(content, format);
    latest.current = { id: current.id, content, format };
    setChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === current.id
          ? { ...chapter, manuscript: content, manuscriptFormat: format, writtenChars: signs, writtenHere: true }
          : chapter,
      ),
    );
    setStatus("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void flush();
    }, 700);
  }

  function addChapter() {
    if (!bookId || readOnly) return;
    void (async () => {
      const created = await createManuscriptChapter(bookId);
      if (!created) return;
      const row: ManuscriptChapter = {
        id: created.id,
        title: created.title,
        order: created.order,
        plannedChars: created.plannedChars,
        writtenChars: created.writtenChars,
        writtenHere: created.writtenHere,
        manuscript: created.manuscript,
        manuscriptFormat: created.manuscriptFormat,
      };
      setChapters((prev) => [...prev, row]);
      setCurrentId(row.id);
    })();
  }

  if (!bookId) {
    return (
      <p className="manuscript-empty">
        Сначала создайте книгу в разделе «О книге». Тогда главы, которые Вы напишете здесь, появятся в трекере.
      </p>
    );
  }

  return (
    <section className="manuscript" data-theme={theme} aria-label="Рукопись">
      <aside className="manuscript-list">
        <div className="manuscript-list-head">
          <span>{bookTitle.trim() || "Книга"}</span>
          {readOnly ? null : (
            <button type="button" className="btn-y manuscript-add" onClick={addChapter}>
              <Plus size={14} /> Новая глава
            </button>
          )}
        </div>
        {chapters.length === 0 ? (
          <p className="manuscript-quiet">Глав пока нет.</p>
        ) : (
          <ul>
            {chapters.map((chapter, index) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  className={chapter.id === current?.id ? "is-on" : undefined}
                  onClick={() => select(chapter.id)}
                >
                  <span>Глава {index + 1}</span>
                  <strong>{chapter.title.trim() || "Без названия"}</strong>
                  <em>{chapter.writtenHere ? `${formatChars(chapter.writtenChars)} зн.` : "вручную"}</em>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <div className="manuscript-sheet">
        {current ? (
          <>
            <div className="manuscript-track">
              <span className="manuscript-kicker">Трекер</span>
              <strong className="manuscript-count">
                {formatChars(current.writtenChars)} знаков
              </strong>
              <span>
                {current.plannedChars > 0
                  ? `план главы ${formatChars(current.plannedChars)}`
                  : "план главы не задан"}
              </span>
              <span className="manuscript-total">
                вся книга {formatChars(written)}
                {planned > 0 ? ` из ${formatChars(planned)}` : ""}
              </span>
              <span className="manuscript-save">{readOnly ? "только чтение" : status === "saving" ? "Сохраняем…" : "Сохранено"}</span>
            </div>
            <div className="manuscript-title-row">
              {readOnly ? (
                <h2>{current.title.trim() || "Без названия"}</h2>
              ) : (
                <input
                  key={current.id}
                  defaultValue={current.title}
                  aria-label="Название главы"
                  placeholder="Название главы"
                  className="manuscript-title"
                  onBlur={(event) => {
                    const title = event.target.value;
                    setChapters((prev) => prev.map((chapter) => (chapter.id === current.id ? { ...chapter, title } : chapter)));
                    void renameManuscriptChapter(current.id, title);
                  }}
                />
              )}
            </div>
            <p className="manuscript-hint">
              {readOnly
                ? "Вы смотрите рукопись ученика. Править текст пока нельзя."
                : current.writtenHere
                  ? "Вы пишете здесь. Знаки считаются сами и уже стоят в трекере. Вручную их менять не нужно."
                  : "Если Вы начнёте писать здесь, знаки в трекере заменятся на подсчёт по тексту."}
            </p>
            {readOnly ? (
              <div className="manuscript-theme-solo">
                <ThemeSwitch theme={theme} onChange={chooseTheme} />
              </div>
            ) : null}
            <WritingEditor
              key={current.id}
              value={current.manuscript}
              format={asFormat(current.manuscriptFormat)}
              onChange={onChange}
              placeholder="Напишите главу здесь"
              variant="focus"
              readOnly={readOnly}
              toolbarExtra={readOnly ? undefined : <ThemeSwitch theme={theme} onChange={chooseTheme} />}
            />
          </>
        ) : (
          <p className="manuscript-quiet">Выберите главу слева или создайте новую.</p>
        )}
      </div>
    </section>
  );
}
