"use client";

import { useState, useTransition } from "react";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { saveFieldOrSuggest, acceptFieldSuggestion } from "./actions";
import type { SuggestableModel } from "@/lib/suggestionRegistry";
import { wordDiff } from "@/lib/wordDiff";

export default function SuggestableField({
  model,
  recordId,
  field,
  value: initialValue,
  suggestion: initialSuggestion,
  as = "textarea",
  className,
  style,
  placeholder,
  resizable,
  onSaved,
}: {
  model: SuggestableModel;
  recordId: string;
  field: string;
  value: string;
  suggestion?: string | null;
  as?: "input" | "textarea";
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  resizable?: boolean;
  // Fires once a value is actually persisted (not just queued as a
  // mentor suggestion) — lets parent list/card components keep their
  // own copy of the record (e.g. a collapsed card's header name) in
  // sync, since this component otherwise tracks the saved value only
  // in its own local state.
  onSaved?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [suggestion, setSuggestion] = useState(initialSuggestion ?? null);
  const [, startTransition] = useTransition();

  function handleBlur(newValue: string) {
    if (newValue === value) return;
    // Wait for the server's actual decision rather than guessing
    // client-side whether this edit will become a suggestion — guessing
    // caused a one-frame flash of the accept-suggestion UI even when
    // review mode was off.
    startTransition(async () => {
      const result = await saveFieldOrSuggest(model, recordId, field, newValue);
      if (result.suggested) {
        setSuggestion(newValue);
      } else {
        setValue(newValue);
        setSuggestion(null);
        onSaved?.(newValue);
      }
    });
  }

  function handleAccept() {
    if (!suggestion) return;
    setValue(suggestion);
    setSuggestion(null);
    startTransition(async () => {
      await acceptFieldSuggestion(model, recordId, field);
      onSaved?.(suggestion);
    });
  }

  if (suggestion) {
    const tokens = wordDiff(value, suggestion);
    return (
      <div className="rounded-sm p-2.5" style={{ border: "1px solid var(--rule)" }}>
        <span className="whitespace-pre-wrap">
          {tokens.map((t, i) =>
            t.type === "same" ? (
              <span key={i}>{t.text}</span>
            ) : t.type === "del" ? (
              <span
                key={i}
                style={{ textDecoration: "line-through", textDecorationColor: "var(--wine)", color: "var(--faded)" }}
              >
                {t.text}
              </span>
            ) : (
              <span
                key={i}
                style={{ textDecoration: "underline wavy", textDecorationColor: "var(--wine)", color: "var(--wine)" }}
              >
                {t.text}
              </span>
            )
          )}
        </span>
        <div className="mt-1.5">
          <button
            onClick={handleAccept}
            className="text-[12px] px-2 py-0.5 rounded-sm"
            style={{ color: "#fff", background: "var(--sage)" }}
          >
            ✓ принять правку
          </button>
        </div>
      </div>
    );
  }

  if (as === "input") {
    return (
      <input
        defaultValue={value}
        placeholder={placeholder}
        onBlur={(e) => handleBlur(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={className}
        style={style}
      />
    );
  }

  return (
    <AutoGrowTextarea
      defaultValue={value}
      placeholder={placeholder}
      onBlur={handleBlur}
      className={className}
      style={style}
      resizable={resizable}
    />
  );
}
