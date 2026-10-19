"use client";

import { useState, useTransition, useRef, type CSSProperties } from "react";
import { Check, X } from "lucide-react";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { saveFieldOrSuggest, acceptFieldSuggestion, rejectFieldSuggestion } from "./actions";
import type { SuggestableModel } from "@/lib/suggestionRegistry";
import { sentenceDiff } from "@/lib/sentenceDiff";

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
  const lastSentRef = useRef(initialValue);

  function handleBlur(newValue: string) {
    if (newValue === lastSentRef.current) return;
    lastSentRef.current = newValue;
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
    lastSentRef.current = suggestion;
    startTransition(async () => {
      await acceptFieldSuggestion(model, recordId, field);
      onSaved?.(suggestion);
    });
  }

  // Отклонение: правка наставника выбрасывается, в поле остаётся свой текст.
  function handleReject() {
    if (!suggestion) return;
    setSuggestion(null);
    lastSentRef.current = value;
    startTransition(async () => {
      await rejectFieldSuggestion(model, recordId, field);
    });
  }

  if (suggestion) {
    const tokens = sentenceDiff(value, suggestion);
    return (
      <div className="rounded-sm p-2.5" style={{ border: "1px solid var(--rule)" }}>
        <span className="whitespace-pre-wrap">
          {tokens.map((t, i) => {
            const prev = tokens[i - 1];
            const separated =
              !!prev &&
              prev.type !== "same" &&
              t.type !== "same" &&
              prev.type !== t.type &&
              !/\s$/.test(prev.text) &&
              !/^\s/.test(t.text);
            const style: CSSProperties =
              t.type === "del"
                ? { textDecoration: "line-through", textDecorationColor: "var(--link)", color: "var(--faded)" }
                : t.type === "add"
                  ? { textDecoration: "underline wavy", textDecorationColor: "var(--link)", color: "var(--link)" }
                  : {};
            if (separated) style.marginLeft = "0.35em";
            return (
              <span key={i} style={style}>
                {t.text}
              </span>
            );
          })}
        </span>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            onClick={handleAccept}
            className="btn-y inline-flex items-center gap-1 px-3.5 text-[12.5px]"
            style={{ height: 32, width: "auto" }}
          >
            <Check size={12} /> принять правку
          </button>
          <button
            onClick={handleReject}
            title="Оставить свой текст, правку убрать"
            className="flex items-center gap-1 text-[12px] px-3.5 py-1 rounded-full"
            style={{ color: "var(--faded)", background: "transparent", border: "1px solid var(--rule)" }}
          >
            <X size={12} /> отклонить
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
