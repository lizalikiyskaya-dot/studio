"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Check, X } from "lucide-react";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { saveFieldOrSuggest, acceptFieldSuggestion, rejectFieldSuggestion, resolveSuggestionHunk } from "./actions";
import { useCanSuggest } from "./SuggestionContext";
import type { SuggestableModel } from "@/lib/suggestionRegistry";
import { markedSuggestion, type MarkedToken } from "@/lib/suggestionHunks";

function tokenClass(token: MarkedToken) {
  if (token.type === "del") return "suggest-del";
  if (token.type === "add") return "suggest-add";
  return undefined;
}

function HunkButtons({ onAccept, onReject }: { onAccept: () => void; onReject: () => void }) {
  return (
    <span className="suggest-hunk-actions">
      <button type="button" onClick={onAccept} className="suggest-accept" title="Принять" aria-label="Принять">
        <Check size={16} />
        <span className="suggest-tip">Принять</span>
      </button>
      <button type="button" onClick={onReject} className="suggest-reject" title="Отклонить" aria-label="Отклонить">
        <X size={16} />
        <span className="suggest-tip">Отклонить</span>
      </button>
    </span>
  );
}

function SuggestionText({
  base,
  suggested,
  className,
  onHunk,
}: {
  base: string;
  suggested: string;
  className?: string;
  onHunk: (index: number, action: "accept" | "reject") => void;
}) {
  const marks = markedSuggestion(base, suggested);
  const pieces: { hunk: number | null; tokens: MarkedToken[] }[] = [];
  for (const token of marks) {
    const last = pieces[pieces.length - 1];
    if (last && last.hunk === token.hunk) last.tokens.push(token);
    else pieces.push({ hunk: token.hunk, tokens: [token] });
  }
  const hunks = new Set(marks.map((token) => token.hunk).filter((hunk) => hunk != null));

  return (
    <div>
      <div className={`suggest-doc ${className ?? ""}`}>
        {pieces.map((piece, index) => {
          const body = piece.tokens.map((token, tokenIndex) => {
            const prev = tokenIndex > 0 ? piece.tokens[tokenIndex - 1] : pieces[index - 1]?.tokens.at(-1);
            const gap = !!prev && prev.type !== token.type && !/\s$/.test(prev.text) && !/^\s/.test(token.text);
            return (
              <span key={tokenIndex} className={tokenClass(token)} style={gap ? { marginLeft: "0.35em" } : undefined}>{token.text}</span>
            );
          });
          if (piece.hunk == null) return <span key={index}>{body}</span>;
          return (
            <span key={index} className="suggest-hunk">
              {body}
              <HunkButtons onAccept={() => onHunk(piece.hunk!, "accept")} onReject={() => onHunk(piece.hunk!, "reject")} />
            </span>
          );
        })}
      </div>
      {hunks.size > 1 && (
        <div className="mt-2 flex items-center gap-2">
          <button type="button" onClick={() => onHunk(-1, "accept")} className="btn-y inline-flex items-center gap-1 px-3.5 text-[12.5px]" style={{ height: 32, width: "auto" }}>
            <Check size={12} /> принять всё
          </button>
          <button type="button" onClick={() => onHunk(-1, "reject")} className="suggest-reject-all">
            <X size={12} /> отклонить всё
          </button>
        </div>
      )}
    </div>
  );
}

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
  ariaLabel,
  autoFocus,
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
  ariaLabel?: string;
  autoFocus?: boolean;
  onSaved?: (value: string) => void;
}) {
  const pathname = usePathname();
  const suggesting = useCanSuggest() && pathname.startsWith("/student-view");
  const [value, setValue] = useState(initialValue);
  const [suggestion, setSuggestion] = useState(initialSuggestion ?? null);
  const [draft, setDraft] = useState(initialSuggestion ?? initialValue);
  const [editorKey, setEditorKey] = useState(0);
  const [, startTransition] = useTransition();
  const lastSentRef = useRef(initialSuggestion ?? initialValue);
  const timerRef = useRef<number | null>(null);

  function applyResult(next: { value: string; suggestion: string | null }, saved: boolean) {
    setValue(next.value);
    setSuggestion(next.suggestion);
    setDraft(next.suggestion ?? next.value);
    lastSentRef.current = next.suggestion ?? next.value;
    setEditorKey((key) => key + 1);
    if (saved) onSaved?.(next.value);
  }

  function persist(nextValue: string) {
    if (nextValue === lastSentRef.current) return;
    lastSentRef.current = nextValue;
    startTransition(async () => {
      const result = await saveFieldOrSuggest(model, recordId, field, nextValue);
      if (result.suggested) {
        setSuggestion(nextValue);
        setDraft(nextValue);
      } else {
        setValue(nextValue);
        setSuggestion(null);
        setDraft(nextValue);
        onSaved?.(nextValue);
      }
    });
  }

  function handleBlur(nextValue: string) {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    persist(nextValue);
  }

  function handleDraft(nextValue: string) {
    setDraft(nextValue);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => persist(nextValue), 450);
  }

  function handleHunk(index: number, action: "accept" | "reject") {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    startTransition(async () => {
      const pendingDraft = suggesting && draft !== value ? draft : suggestion;
      if (suggesting && pendingDraft && pendingDraft !== (suggestion ?? value)) {
        await saveFieldOrSuggest(model, recordId, field, pendingDraft);
        lastSentRef.current = pendingDraft;
      }
      if (index < 0) {
        if (action === "accept") await acceptFieldSuggestion(model, recordId, field);
        else await rejectFieldSuggestion(model, recordId, field);
        const nextValue = action === "accept" && pendingDraft ? pendingDraft : value;
        applyResult({ value: nextValue, suggestion: null }, action === "accept");
        return;
      }
      const next = await resolveSuggestionHunk(model, recordId, field, index, action);
      applyResult(next, next.value !== value);
    });
  }

  if (suggesting) {
    const pending = draft !== value ? draft : suggestion;
    return (
      <div data-review-field="">
        {pending && pending !== value && (
          <SuggestionText base={value} suggested={pending} className={className} onHunk={handleHunk} />
        )}
        {as === "input" ? (
          <input
            key={editorKey}
            defaultValue={draft}
            placeholder={placeholder}
            aria-label={ariaLabel}
            autoFocus={autoFocus}
            onChange={(event) => handleDraft(event.target.value)}
            onBlur={(event) => handleBlur(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            className={className}
            style={style}
          />
        ) : (
          <AutoGrowTextarea
            key={editorKey}
            defaultValue={draft}
            placeholder={placeholder}
            ariaLabel={ariaLabel}
            autoFocus={autoFocus}
            onChange={handleDraft}
            onBlur={handleBlur}
            className={className}
            style={pending && pending !== value ? { ...style, marginTop: 8 } : style}
            resizable={resizable}
            submitOnEnter={false}
          />
        )}
      </div>
    );
  }

  if (suggestion) {
    return <SuggestionText base={value} suggested={suggestion} className={className} onHunk={handleHunk} />;
  }

  if (as === "input") {
    return (
      <input
        defaultValue={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
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
      ariaLabel={ariaLabel}
      autoFocus={autoFocus}
      onBlur={handleBlur}
      className={className}
      style={style}
      resizable={resizable}
      submitOnEnter={false}
    />
  );
}
