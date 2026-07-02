"use client";

import { useState, useRef, useEffect } from "react";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";

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
            style={{ color: "var(--accent)" }}
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

/**
 * Text field that shows pasted URLs as the word "ссылка" while idle, and
 * turns into a normal editable textarea on click (saving on blur). Lets a
 * note/description field hold links without showing the raw URL.
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
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <AutoGrowTextarea
        ref={taRef}
        defaultValue={value}
        onBlur={(v) => { setValue(v); setEditing(false); onSave(v); }}
        placeholder={placeholder}
        className={className}
        style={style}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-text whitespace-pre-wrap ${className ?? ""}`}
      style={{ minHeight: "1.4em", ...style }}
    >
      {value
        ? <LinkifiedText text={value} />
        : <span style={{ color: "var(--faded)" }}>{placeholder}</span>}
    </div>
  );
}
