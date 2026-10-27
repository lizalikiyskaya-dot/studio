"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Pencil } from "lucide-react";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { useCanSuggest } from "@/features/suggestions/SuggestionContext";
import type { SuggestableModel } from "@/lib/suggestionRegistry";

function stop(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export default function InlineTitle({
  value,
  onSave,
  placeholder = "Название",
  autoFocus = false,
  className = "",
  bubbleTitle = false,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Title text belongs to a parent toggle. Only the pencil starts renaming. */
  bubbleTitle?: boolean;
}) {
  const [editing, setEditing] = useState(autoFocus);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const field = ref.current;
    field?.focus();
    field?.select();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (next !== value.trim()) onSave(next);
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        aria-label={placeholder}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent font-semibold outline-none ${className}`}
        onClick={stop}
        onMouseDown={stop}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            const next = draft.trim();
            setEditing(false);
            if (next !== value.trim()) onSave(next);
            return;
          }
          stop(event);
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    );
  }

  if (bubbleTitle) {
    return (
      <span className="inline-flex min-w-0 max-w-full flex-1 items-center gap-1.5">
        <span className={`min-w-0 flex-1 truncate text-left font-semibold ${className}`}>
          {value.trim() || placeholder}
        </span>
        <button
          type="button"
          aria-label="переименовать"
          title="переименовать"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
          style={{ background: "#fff", color: "var(--ink)", border: "1px solid var(--border)" }}
          onClick={(event) => {
            stop(event);
            setEditing(true);
          }}
        >
          <Pencil size={13} />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5" onClick={stop} onMouseDown={stop}>
      <button
        type="button"
        className={`min-w-0 truncate text-left font-semibold ${className}`}
        onClick={(event) => {
          stop(event);
          setEditing(true);
        }}
      >
        {value.trim() || placeholder}
      </button>
      <button
        type="button"
        aria-label="переименовать"
        title="переименовать"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
        style={{ background: "#fff", color: "var(--ink)", border: "1px solid var(--border)" }}
        onClick={(event) => {
          stop(event);
          setEditing(true);
        }}
      >
        <Pencil size={13} />
      </button>
    </span>
  );
}

export function CardTitle({
  value,
  onSave,
  placeholder = "Название",
  autoFocus = false,
  className = "",
  model,
  recordId,
  field = "name",
  suggestion,
}: {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  model?: SuggestableModel;
  recordId?: string;
  field?: string;
  suggestion?: string | null;
}) {
  const pathname = usePathname();
  const suggesting = useCanSuggest() && pathname.startsWith("/student-view");
  if (model && recordId && (suggesting || suggestion)) {
    return (
      <span className="min-w-0 flex-1" onClick={stop} onMouseDown={stop}>
        <SuggestableField
          model={model}
          recordId={recordId}
          field={field}
          value={value}
          suggestion={suggestion}
          as="input"
          autoFocus={autoFocus}
          onSaved={onSave}
          ariaLabel={placeholder}
          placeholder={placeholder}
          className={`heading w-full bg-transparent font-semibold outline-none ${className}`}
        />
      </span>
    );
  }
  return (
    <InlineTitle
      value={value}
      onSave={onSave}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className}
    />
  );
}
