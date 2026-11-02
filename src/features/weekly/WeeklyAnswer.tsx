"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import WritingEditor from "@/features/exercises/additional/WritingEditor";
import { countSigns } from "@/features/drafts/manuscriptCount";
import { formatChars } from "@/features/acts/chapterText";
import { weeklyFormat, weeklyPlain } from "./weeklyText";

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

function useWindow() {
  const [theme, setTheme] = useState<Theme>("white");
  const [zoom, setZoom] = useState(100);
  return { theme, setTheme, zoom, setZoom };
}

function remember(viewerId: string, theme: Theme, zoom: number) {
  try {
    localStorage.setItem(themeKey(viewerId), theme);
    localStorage.setItem(zoomKey(viewerId), String(zoom));
  } catch {
    // Хранилище недоступно: выбор живёт до обновления страницы.
  }
}

export function WeeklyEditor({
  viewerId,
  value,
  onChange,
}: {
  viewerId: string;
  value: string;
  onChange: (text: string) => void;
}) {
  const format = weeklyFormat(value);
  const { theme, setTheme, zoom, setZoom } = useWindow();
  const [focus, setFocus] = useState(false);
  const signs = countSigns(value, format);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTheme(readTheme(viewerId));
      setZoom(readZoom(viewerId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [viewerId, setTheme, setZoom]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    remember(viewerId, next, zoom);
  }

  function bumpZoom(step: number) {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + step));
    setZoom(next);
    remember(viewerId, theme, next);
  }

  function edit(content: string) {
    onChange(content);
  }

  const screen = focus ? (
    <div
      className="manuscript manuscript-focus"
      data-theme={theme}
      style={{ "--manuscript-zoom": zoom / 100 } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="Режим письма"
    >
      <div className="manuscript-focus-top">
        <h2>Задание недели</h2>
        <span className="manuscript-count">{formatChars(signs)} знаков</span>
        <span className="manuscript-zoom">
          <button type="button" aria-label="Уменьшить текст" disabled={zoom <= ZOOM_MIN} onClick={() => bumpZoom(-ZOOM_STEP)}>−</button>
          <button type="button" aria-label="Увеличить текст" disabled={zoom >= ZOOM_MAX} onClick={() => bumpZoom(ZOOM_STEP)}>+</button>
        </span>
        <ThemeSwitch theme={theme} onChange={chooseTheme} />
        <button type="button" className="writing-tool manuscript-glyph" aria-label="Свернуть" onClick={() => setFocus(false)}>
          <span aria-hidden="true">⤡</span>
        </button>
      </div>
      <WritingEditor
        value={value}
        format={format}
        onChange={edit}
        placeholder="Напишите здесь. Задание необязательное."
        variant="focus"
      />
    </div>
  ) : null;

  return (
    <div className="weekly-editor">
      <div className="manuscript-open-row">
        <span className="manuscript-count">{formatChars(signs)} знаков</span>
        <button type="button" className="writing-tool manuscript-glyph" aria-label="Развернуть на весь экран" onClick={() => setFocus(true)}>
          <span aria-hidden="true">⤢</span>
        </button>
      </div>
      {focus ? null : (
        <WritingEditor
          value={value}
          format={format}
          onChange={edit}
          placeholder="Напишите здесь. Задание необязательное."
          variant="focus"
        />
      )}
      {screen && typeof document !== "undefined" ? createPortal(screen, document.body) : null}
    </div>
  );
}

export function WeeklyPreview({
  viewerId,
  title,
  text,
}: {
  viewerId: string;
  title: string;
  text: string;
}) {
  const format = weeklyFormat(text);
  const plain = weeklyPlain(text);
  const { theme, setTheme, zoom, setZoom } = useWindow();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTheme(readTheme(viewerId));
      setZoom(readZoom(viewerId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [viewerId, setTheme, setZoom]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    remember(viewerId, next, zoom);
  }

  function bumpZoom(step: number) {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + step));
    setZoom(next);
    remember(viewerId, theme, next);
  }

  const screen = open ? (
    <div
      className="manuscript manuscript-focus"
      data-theme={theme}
      style={{ "--manuscript-zoom": zoom / 100 } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="Текст задания"
    >
      <div className="manuscript-focus-top">
        <h2>{title.trim() || "Задание недели"}</h2>
        <span className="manuscript-count">{formatChars(countSigns(text, format))} знаков</span>
        <span className="manuscript-zoom">
          <button type="button" aria-label="Уменьшить текст" disabled={zoom <= ZOOM_MIN} onClick={() => bumpZoom(-ZOOM_STEP)}>−</button>
          <button type="button" aria-label="Увеличить текст" disabled={zoom >= ZOOM_MAX} onClick={() => bumpZoom(ZOOM_STEP)}>+</button>
        </span>
        <ThemeSwitch theme={theme} onChange={chooseTheme} />
        <button type="button" className="weekly-expand" onClick={() => setOpen(false)}>Свернуть</button>
      </div>
      <WritingEditor value={text} format={format} onChange={() => {}} placeholder="" variant="focus" readOnly />
    </div>
  ) : null;

  return (
    <div className="weekly-preview">
      <p>{plain}</p>
      <button type="button" className="weekly-expand" onClick={() => setOpen(true)}>Развернуть</button>
      {screen && typeof document !== "undefined" ? createPortal(screen, document.body) : null}
    </div>
  );
}
