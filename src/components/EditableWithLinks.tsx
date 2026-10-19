"use client";

import { useLayoutEffect, useRef, useState } from "react";

const URL_RE = /https?:\/\/[^\s]+/g;

function linkifyParts(text: string): { type: "text" | "url"; value: string }[] {
  const parts: { type: "text" | "url"; value: string }[] = [];
  let last = 0;
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    parts.push({ type: "url", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

/** Renders plain text but collapses any URL into the word "ссылка". */
export function LinkifiedText({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  const parts = linkifyParts(text);
  return (
    <span className={className} style={style}>
      {parts.map((p, i) =>
        p.type === "url" ? (
          <a
            key={i}
            href={p.value}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ color: "var(--vi)" }}
          >
            ссылка
          </a>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </span>
  );
}

function mirrorText(value: string, placeholder?: string) {
  const shown = value || placeholder || "\u00a0";
  // A trailing newline does not give a div a last line; the textarea still has one.
  return value.endsWith("\n") ? `${shown}\u00a0` : shown;
}

/**
 * Text field that shows pasted URLs as the word "ссылка" while idle, and
 * turns into a normal editable textarea on click (saving on blur). Lets a
 * note/description field hold links without showing the raw URL.
 *
 * The textarea is taken out of flow and painted over a mirror of the same
 * text. A real textarea inside a table has its own preferred width (the
 * cols default), so swapping the div for it resizes the column and slides
 * the rest of the row sideways. The mirror keeps that width, font, and
 * line-height, and focus does not scroll the page.
 */
export default function EditableWithLinks({
  defaultValue,
  onSave,
  placeholder,
  className,
  style,
}: {
  defaultValue: string;
  onSave: (v: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const textClass = ["whitespace-pre-wrap", "break-words", className].filter(Boolean).join(" ");

  useLayoutEffect(() => {
    if (!editing) return;
    const mirror = mirrorRef.current;
    const ta = taRef.current;
    if (!mirror || !ta) return;
    const cs = getComputedStyle(mirror);
    ta.style.fontSize = cs.fontSize;
    ta.style.fontFamily = cs.fontFamily;
    ta.style.fontWeight = cs.fontWeight;
    ta.style.fontStyle = cs.fontStyle;
    ta.style.lineHeight = cs.lineHeight;
    ta.style.letterSpacing = cs.letterSpacing;
    ta.style.wordBreak = cs.wordBreak;
    ta.style.overflowWrap = cs.overflowWrap;
    ta.style.whiteSpace = "pre-wrap";
    ta.style.padding = "0";
    ta.style.border = "0";
    ta.focus({ preventScroll: true });
  }, [editing]);

  function commit(next: string) {
    setValue(next);
    setEditing(false);
    onSave(next);
  }

  return (
    <div className="inline-edit" data-editing={editing ? "true" : "false"}>
      <div
        ref={mirrorRef}
        onClick={() => {
          if (!editing) setEditing(true);
        }}
        className={`${editing ? "" : "cursor-text"} ${textClass}`}
        style={{ minHeight: "1.4em", visibility: editing ? "hidden" : "visible", ...style }}
        aria-hidden={editing || undefined}
      >
        {editing ? (
          mirrorText(value, placeholder)
        ) : value ? (
          <LinkifiedText text={value} />
        ) : (
          <span style={{ color: "var(--faded)" }}>{placeholder}</span>
        )}
      </div>
      {editing ? (
        <textarea
          ref={taRef}
          className={`inline-edit-control ${textClass}`}
          value={value}
          placeholder={placeholder}
          rows={1}
          onChange={(event) => setValue(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commit(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
          style={style}
        />
      ) : null}
    </div>
  );
}
