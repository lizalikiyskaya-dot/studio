"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FileUp, Plus, Trash2 } from "lucide-react";
import WritingEditor from "@/features/exercises/additional/WritingEditor";
import ManuscriptFocus from "./ManuscriptFocus";
import type { ContentFormat } from "@/features/exercises/additional/richText";
import { formatChars } from "@/features/acts/chapterText";
import { countSigns } from "./manuscriptCount";
import { siteAlert, siteConfirm } from "@/components/SiteDialog";
import { deletePlanChapter } from "@/features/books/actions";
import { createManuscriptChapter, renameManuscriptChapter, saveManuscriptChapter } from "./actions";
import ManuscriptImport from "./ManuscriptImport";
import { manuscriptLastKey } from "@/lib/writeChapterKey";

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

function BookPick({
  books,
  value,
  onChange,
}: {
  books: { id: string; title: string }[];
  value: string;
  onChange: (bookId: string) => void;
}) {
  return (
    <label className="manuscript-book">
      <span>Книга</span>
      <select aria-label="Книга" value={value} onChange={(event) => onChange(event.target.value)}>
        {books.map((book) => (
          <option key={book.id} value={book.id}>{book.title.trim() || "Без названия"}</option>
        ))}
      </select>
    </label>
  );
}

function asFormat(value: string): ContentFormat {
  return value === "markdown" ? "markdown" : "plain";
}

export default function ManuscriptDesk({
  bookId,
  bookTitle,
  initialChapters,
  viewerId,
  readOnly,
  focusChapterId = null,
  startFocus = false,
  books = [],
}: {
  bookId: string | null;
  bookTitle: string;
  initialChapters: ManuscriptChapter[];
  viewerId: string;
  readOnly: boolean;
  focusChapterId?: string | null;
  startFocus?: boolean;
  books?: { id: string; title: string }[];
}) {
  const [focus, setFocus] = useState(startFocus);
  const [importOpen, setImportOpen] = useState(false);
  const [chapters, setChapters] = useState(initialChapters);
  const [currentId, setCurrentId] = useState(() => {
    if (focusChapterId && initialChapters.some((chapter) => chapter.id === focusChapterId)) return focusChapterId;
    return initialChapters[0]?.id ?? null;
  });
  const [status, setStatus] = useState<"saved" | "saving">("saved");
  const timer = useRef<number | null>(null);
  const latest = useRef<{ id: string; content: string; format: ContentFormat } | null>(null);
  const deskRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const focusRef = useRef(false);
  const canFocusRef = useRef(false);

  useEffect(() => {
    if (!bookId || !currentId) return;
    try {
      localStorage.setItem(manuscriptLastKey(bookId), currentId);
    } catch {
      // Хранилище недоступно: виджет откроет последнюю главу книги.
    }
  }, [bookId, currentId]);

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

  function chooseBook(nextBookId: string, stayFocus: boolean) {
    const query = new URLSearchParams();
    query.set("book", nextBookId);
    query.set("part", "write");
    if (stayFocus) {
      query.set("focus", "1");
      try {
        const saved = localStorage.getItem(manuscriptLastKey(nextBookId));
        if (saved) query.set("chapter", saved);
      } catch {
        // Откроется первая глава выбранной книги.
      }
    }
    window.location.assign(`${pathname}?${query.toString()}`);
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

  async function removeChapter(chapterId: string) {
    if (readOnly) return;
    if (!(await siteConfirm("Удалить главу?"))) return;
    if (timer.current) window.clearTimeout(timer.current);
    if (latest.current?.id === chapterId) latest.current = null;
    const result = await deletePlanChapter(chapterId);
    if (!result.ok) {
      await siteAlert(result.message);
      return;
    }
    const remaining = chapters.filter((chapter) => chapter.id !== chapterId);
    const index = chapters.findIndex((chapter) => chapter.id === chapterId);
    setChapters(remaining);
    if (currentId === chapterId) {
      setCurrentId(remaining[index]?.id ?? remaining[index - 1]?.id ?? null);
      setFocus(false);
    }
  }

  if (!bookId) {
    return (
      <p className="manuscript-empty">
        Сначала создайте книгу в разделе «О книге». Тогда главы, которые Вы напишете здесь, появятся в трекере.
      </p>
    );
  }

  const focusScreen = focus && current ? (
    <ManuscriptFocus
      key={current.id}
      title={current.title}
      value={current.manuscript}
      format={asFormat(current.manuscriptFormat)}
      onChange={onChange}
      placeholder="Напишите главу здесь"
      readOnly={readOnly}
      viewerId={viewerId}
      layout="screen"
      onClose={() => setFocus(false)}
      leading={
        <>
          {books.length > 1 && bookId ? (
            <BookPick books={books} value={bookId} onChange={(id) => chooseBook(id, true)} />
          ) : null}
          {readOnly ? null : (
            <button type="button" className="chapter-tool chapter-tool-icon" aria-label="Удалить главу" onClick={() => removeChapter(current.id)}>
              <Trash2 size={14} />
              Удалить
            </button>
          )}
        </>
      }
    />
  ) : null;

  return (
    <section ref={deskRef} className="manuscript" aria-label="Рукопись">
      <aside className="manuscript-list">
        <div className="manuscript-list-head">
          {books.length > 1 && bookId ? (
            <BookPick books={books} value={bookId} onChange={(id) => chooseBook(id, false)} />
          ) : (
            <span>{bookTitle.trim() || "Книга"}</span>
          )}
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
              <li key={chapter.id} className="manuscript-chapter">
                <button
                  type="button"
                  className={chapter.id === current?.id ? "manuscript-chapter-pick is-on" : "manuscript-chapter-pick"}
                  onClick={() => select(chapter.id)}
                >
                  <span>Глава {index + 1}</span>
                  <strong>{chapter.title.trim() || "Без названия"}</strong>
                  {chapter.writtenHere ? <em>{formatChars(chapter.writtenChars)} зн.</em> : null}
                </button>
                {readOnly ? null : (
                  <button
                    type="button"
                    className="manuscript-chapter-delete"
                    aria-label={`Удалить главу ${index + 1}`}
                    onClick={() => removeChapter(chapter.id)}
                  >
                    <Trash2 size={14} />
                    Удалить
                  </button>
                )}
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
              {readOnly ? null : (
                <button type="button" className="chapter-tool chapter-tool-icon" aria-label="Удалить главу" onClick={() => removeChapter(current.id)}>
                  <Trash2 size={14} />
                  Удалить
                </button>
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
