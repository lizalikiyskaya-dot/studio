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
}) {
  const [value, setValue] = useState(initialValue);
  const [suggestion, setSuggestion] = useState(initialSuggestion ?? null);
  const [, startTransition] = useTransition();

  function handleBlur(newValue: string) {
    startTransition(async () => {
      const result = await saveFieldOrSuggest(model, recordId, field, newValue);
      if (result.suggested) {
        setSuggestion(newValue);
      } else {
        setValue(newValue);
        setSuggestion(null);
      }
    });
  }

  function handleAccept() {
    if (!suggestion) return;
    setValue(suggestion);
    setSuggestion(null);
    startTransition(() => acceptFieldSuggestion(model, recordId, field));
  }

  if (suggestion) {
    const tokens = wordDiff(value, suggestion);
    return (
      <div className="rounded-sm p-2.5" style={{ border: "1px solid var(--rule)" }}>
        <span>
          {tokens.map((t, i) =>
            t.type === "same" ? (
              <span key={i}>{t.text}</span>
            ) : t.type === "del" ? (
              <span key={i} style={{ textDecoration: "line-through", color: "var(--sage)" }}>
                {t.text}
              </span>
            ) : (
              <span key={i} style={{ color: "var(--sage)" }}>
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
    />
  );
}
