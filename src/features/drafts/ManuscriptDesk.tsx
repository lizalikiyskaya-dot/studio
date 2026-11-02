"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FileUp, Plus } from "lucide-react";
import WritingEditor from "@/features/exercises/additional/WritingEditor";
import type { ContentFormat } from "@/features/exercises/additional/richText";
import { formatChars } from "@/features/acts/chapterText";
import { countSigns } from "./manuscriptCount";
import { createManuscriptChapter, renameManuscriptChapter, saveManuscriptChapter } from "./actions";
import ManuscriptImport from "./ManuscriptImport";

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

const ZOOM_MIN = 80;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

function themeKey(viewerId: string) {
  return `manuscript-theme:${viewerId}`;
}

function zoomKey(viewerId: string) {
  return `manuscript-zoom:${viewerId}`;
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

function readZoom(viewerId: string) {
  try {
    const saved = Number(localStorage.getItem(zoomKey(viewerId)));
    if (Number.isFinite(saved) && saved >= ZOOM_MIN && saved <= ZOOM_MAX) return saved;
  } catch {
    // Хранилище недоступно: остаётся обычный размер.
  }
  return 100;
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
  const [zoom, setZoom] = useState(100);
  const [focus, setFocus] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [chapters, setChapters] = useState(initialChapters);
  const [currentId, setCurrentId] = useState(initialChapters[0]?.id ?? null);
  const [status, setStatus] = useState<"saved" | "saving">("saved");
  const timer = useRef<number | null>(null);
  const latest = useRef<{ id: string; content: string; format: ContentFormat } | null>(null);
  const deskRef = useRef<HTMLElement>(null);
  const focusRef = useRef(false);
  const canFocusRef = useRef(false);

  useEffect(() => {
    setTheme(readTheme(viewerId));
    setZoom(readZoom(viewerId));
  }, [viewerId]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("manuscript-page");
    root.removeAttribute("data-manuscript-theme");
    return () => {
      root.classList.remove("manuscript-page");
      root.removeAttribute("data-manuscript-theme");
    };
  }, []);

  useEffect(() => {
    let acc = 0;
    let idle = 0;
    let lockedUntil = 0;
    function onWheel(event: WheelEvent) {
      const target = event.target;
      const inDesk = target instanceof Node && (
        (deskRef.current?.contains(target) ?? false) ||
        (target instanceof Element && target.closest(".manuscript-focus") !== null)
      );
      if (!inDesk) return;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal) {
        acc = 0;
        return;
      }
      if (target instanceof Element && target.closest("select, input, textarea, button, a")) return;
      event.preventDefault();
      const selection = document.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim() !== "") return;
      const now = Date.now();
      if (now < lockedUntil) return;
      acc += event.deltaX;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        acc = 0;
      }, 180);
      if (acc <= -90 && !focusRef.current && canFocusRef.current) {
        acc = 0;
        lockedUntil = now + 500;
        setFocus(true);
      } else if (acc >= 90 && focusRef.current) {
        acc = 0;
        lockedUntil = now + 500;
        setFocus(false);
      }
    }
    document.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      document.removeEventListener("wheel", onWheel);
      window.clearTimeout(idle);
    };
  }, []);

  useEffect(() => {
    if (!focus) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setFocus(false);
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [focus]);

  useEffect(() => {
    if (!focus) return;
    function onKey(event: KeyboardEvent) {
      const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const chord = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
      if (!chord || event.altKey) return;
      const zoomIn = event.code === "Equal" || event.code === "NumpadAdd";
      const zoomOut = !event.shiftKey && (event.code === "Minus" || event.code === "NumpadSubtract");
      const reset = !event.shiftKey && (event.code === "Digit0" || event.code === "Numpad0");
      if (!zoomIn && !zoomOut && !reset) return;
      event.preventDefault();
      setZoom((current) => {
        const next = reset ? 100 : Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current + (zoomIn ? ZOOM_STEP : -ZOOM_STEP)));
        try {
          localStorage.setItem(zoomKey(viewerId), String(next));
        } catch {
          // Размер останется до перезагрузки страницы.
        }
        return next;
      });
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [focus, viewerId]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem(themeKey(viewerId), next);
    } catch {
      // Выбор останется до перезагрузки страницы.
    }
  }

  function bumpZoom(delta: number) {
    setZoom((current) => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current + delta));
      try {
        localStorage.setItem(zoomKey(viewerId), String(next));
      } catch {
        // Размер останется до перезагрузки страницы.
      }
      return next;
    });
  }

  const current = chapters.find((chapter) => chapter.id === currentId) ?? null;
  focusRef.current = focus;
  canFocusRef.current = current !== null;
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

  const focusScreen = focus && current ? createPortal(
    <div
      className="manuscript manuscript-focus"
      data-theme={theme}
      style={{ "--manuscript-zoom": zoom / 100 } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="Режим письма"
    >
      <div className="manuscript-focus-top">
        <h2>{current.title.trim() || "Без названия"}</h2>
        <span className="manuscript-count">{formatChars(current.writtenChars)} знаков</span>
        <span className="manuscript-zoom">
          <button type="button" title="Уменьшить текст" aria-label="Уменьшить текст" disabled={zoom <= ZOOM_MIN} onClick={() => bumpZoom(-ZOOM_STEP)}>−</button>
          <button type="button" title="Увеличить текст" aria-label="Увеличить текст" disabled={zoom >= ZOOM_MAX} onClick={() => bumpZoom(ZOOM_STEP)}>+</button>
        </span>
        <ThemeSwitch theme={theme} onChange={chooseTheme} />
        <button
          type="button"
          className="writing-tool manuscript-glyph"
          title="Свернуть"
          aria-label="Свернуть"
          onClick={() => setFocus(false)}
        >
          <span aria-hidden="true">⤡</span>
        </button>
      </div>
      <WritingEditor
        key={current.id}
        value={current.manuscript}
        format={asFormat(current.manuscriptFormat)}
        onChange={onChange}
        placeholder="Напишите главу здесь"
        variant="focus"
        readOnly={readOnly}
      />
    </div>,
    document.body,
  ) : null;

  return (
    <section ref={deskRef} className="manuscript" aria-label="Рукопись">
      <aside className="manuscript-list">
        <div className="manuscript-list-head">
          <span>{bookTitle.trim() || "Книга"}</span>
        </div>
        {readOnly ? null : (
          <div className="manuscript-list-actions">
            <button type="button" className="btn-y manuscript-add" onClick={addChapter}>
              <Plus size={14} /> Новая глава
            </button>
            <button type="button" className="manuscript-upload" onClick={() => setImportOpen(true)}>
              <FileUp size={14} /> Загрузить текст
            </button>
          </div>
        )}
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
                  {chapter.writtenHere ? <em>{formatChars(chapter.writtenChars)} зн.</em> : null}
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
            <div className="manuscript-open-row">
              <p className="manuscript-swipe-hint">Смахните двумя пальцами или нажмите ⤢</p>
              <button
                type="button"
                className="writing-tool manuscript-glyph"
                title="Развернуть на весь экран"
                aria-label="Развернуть на весь экран"
                onClick={() => setFocus(true)}
              >
                <span aria-hidden="true">⤢</span>
              </button>
            </div>
            {focus ? null : (
              <WritingEditor
                key={current.id}
                value={current.manuscript}
                format={asFormat(current.manuscriptFormat)}
                onChange={onChange}
                placeholder="Напишите главу здесь"
                variant="focus"
                readOnly={readOnly}
              />
            )}
          </>
        ) : (
          <p className="manuscript-quiet">Выберите главу слева или создайте новую.</p>
        )}
      </div>
      {focusScreen}
      {importOpen && bookId ? (
        <ManuscriptImport
          bookId={bookId}
          onClose={() => setImportOpen(false)}
          onCreated={(created) => {
            setChapters((prev) => [...prev, ...created]);
            setCurrentId(created[0]?.id ?? currentId);
            setImportOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
