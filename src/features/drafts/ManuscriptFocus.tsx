"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import WritingEditor from "@/features/exercises/additional/WritingEditor";
import type { ContentFormat } from "@/features/exercises/additional/richText";
import { countSigns } from "./manuscriptCount";
import { formatChars } from "@/features/acts/chapterText";

const THEMES = [
  { id: "white", label: "Белая" },
  { id: "paper", label: "Бумага" },
  { id: "dark", label: "Тёмная" },
] as const;

type Theme = (typeof THEMES)[number]["id"];

const ZOOM_MIN = 80;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const MEASURE_MIN = 52;
const MEASURE_MAX = 88;
const MEASURE_STEP = 6;
const MEASURE_DEFAULT = 70;

function themeKey(viewerId: string) {
  return `manuscript-theme:${viewerId}`;
}

function zoomKey(viewerId: string) {
  return `manuscript-zoom:${viewerId}`;
}

function measureKey(viewerId: string) {
  return `manuscript-measure:${viewerId}`;
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

function readMeasure(viewerId: string) {
  try {
    const saved = Number(localStorage.getItem(measureKey(viewerId)));
    if (Number.isFinite(saved) && saved >= MEASURE_MIN && saved <= MEASURE_MAX) return saved;
  } catch {
    // Хранилище недоступно: остаётся удобная ширина строки.
  }
  return MEASURE_DEFAULT;
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

export default function ManuscriptFocus({
  title,
  value,
  format,
  onChange,
  placeholder,
  readOnly = false,
  viewerId,
  layout,
  onClose,
  leading = null,
}: {
  title: string;
  value: string;
  format: ContentFormat;
  onChange: (content: string, format: ContentFormat) => void;
  placeholder: string;
  readOnly?: boolean;
  viewerId: string;
  layout: "screen" | "page";
  onClose: () => void;
  leading?: ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("white");
  const [zoom, setZoom] = useState(100);
  const [measure, setMeasure] = useState(MEASURE_DEFAULT);
  const [view, setView] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTheme(readTheme(viewerId));
      setZoom(readZoom(viewerId));
      setMeasure(readMeasure(viewerId));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [viewerId]);

  useEffect(() => {
    if (layout !== "screen") return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [layout, onClose]);

  useEffect(() => {
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
  }, [viewerId]);

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

  function bumpMeasure(delta: number) {
    setMeasure((current) => {
      const next = Math.min(MEASURE_MAX, Math.max(MEASURE_MIN, current + delta));
      try {
        localStorage.setItem(measureKey(viewerId), String(next));
      } catch {
        // Ширина останется до перезагрузки страницы.
      }
      return next;
    });
  }

  const signs = countSigns(value, format);
  const frame = (
    <div
      className={layout === "screen" ? "manuscript manuscript-focus" : "manuscript-focus weekly-write"}
      data-theme={theme}
      style={{ "--manuscript-zoom": zoom / 100, "--manuscript-measure": measure } as CSSProperties}
      role={layout === "screen" ? "dialog" : undefined}
      aria-modal={layout === "screen" ? true : undefined}
      aria-label={layout === "screen" ? "Режим письма" : undefined}
    >
      {leading ? <div className="manuscript-focus-book">{leading}</div> : null}
      <p className="manuscript-focus-title">{title.trim() || "Без названия"}</p>
      <span className="manuscript-count-side">{formatChars(signs)}</span>
      <WritingEditor
        value={value}
        format={format}
        onChange={onChange}
        placeholder={placeholder}
        variant="focus"
        readOnly={readOnly}
        toolbarExtra={
          <>
            <span className="manuscript-view-anchor">
              <button type="button" className="writing-tool" aria-expanded={view} aria-label="Вид текста" title="Вид текста" onClick={() => setView((open) => !open)}>
                ···
              </button>
              {view ? (
                <span className="manuscript-view">
                  <span className="manuscript-zoom">
                    <button type="button" title="Уменьшить текст" aria-label="Уменьшить текст" disabled={zoom <= ZOOM_MIN} onClick={() => bumpZoom(-ZOOM_STEP)}>−</button>
                    <button type="button" title="Увеличить текст" aria-label="Увеличить текст" disabled={zoom >= ZOOM_MAX} onClick={() => bumpZoom(ZOOM_STEP)}>+</button>
                  </span>
                  <span className="manuscript-measure">
                    <button type="button" title="Уже колонка" aria-label="Уже колонка" disabled={measure <= MEASURE_MIN} onClick={() => bumpMeasure(-MEASURE_STEP)}>Уже</button>
                    <button type="button" title="Шире колонка" aria-label="Шире колонка" disabled={measure >= MEASURE_MAX} onClick={() => bumpMeasure(MEASURE_STEP)}>Шире</button>
                  </span>
                  <ThemeSwitch theme={theme} onChange={chooseTheme} />
                </span>
              ) : null}
            </span>
            <button
              type="button"
              className="writing-tool manuscript-glyph"
              title={layout === "screen" ? "Свернуть" : "Развернуть на весь экран"}
              aria-label={layout === "screen" ? "Свернуть" : "Развернуть на весь экран"}
              onClick={onClose}
            >
              <span aria-hidden="true">{layout === "screen" ? "⤡" : "⤢"}</span>
            </button>
          </>
        }
      />
      {readOnly ? (
        <button type="button" className="weekly-expand manuscript-focus-close" onClick={onClose}>
          Свернуть
        </button>
      ) : null}
    </div>
  );

  if (layout === "screen") {
    if (typeof document === "undefined") return null;
    return createPortal(frame, document.body);
  }
  return frame;
}
