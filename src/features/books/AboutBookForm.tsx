"use client";

import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { ChevronDown } from "lucide-react";
import type { Book, Comment } from "@/generated/prisma/client";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { CoverCarousel } from "@/components/ProfilePhotos";
import { updateSynopsisMode, updateBookPhotoPosition } from "./actions";

function Field({ label, value, field, bookId, suggestion }: { label: string; value: string; field: string; bookId: string; suggestion?: string }) {
  return (
    <div className="mb-5">
      <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>{label}</label>
      <SuggestableField model="Book" recordId={bookId} field={field} value={value} suggestion={suggestion} as="input"
        className="w-full border-b py-1.5 text-[15px] outline-none bg-transparent" style={{ borderColor: "var(--rule)" }} />
    </div>
  );
}

function TextAreaField({ label, value, field, bookId, suggestion, minHeight = 60 }: { label: string; value: string; field: string; bookId: string; suggestion?: string; minHeight?: number }) {
  return (
    <div className="mb-5 max-w-[680px]">
      <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>{label}</label>
      <SuggestableField model="Book" recordId={bookId} field={field} value={value} suggestion={suggestion}
        style={{ borderColor: "var(--rule)", minHeight }}
        className="reading w-full border-b py-1.5 outline-none bg-transparent resize-vertical" />
    </div>
  );
}

function SynopsisBlock({
  book,
  suggestions,
  synopsisMode,
  setSynopsisMode,
  synopsisOpen,
  setSynopsisOpen,
  startTransition,
}: {
  book: Book;
  suggestions: Record<string, string>;
  synopsisMode: Book["synopsisMode"];
  setSynopsisMode: Dispatch<SetStateAction<Book["synopsisMode"]>>;
  synopsisOpen: boolean;
  setSynopsisOpen: Dispatch<SetStateAction<boolean>>;
  startTransition: (callback: () => void) => void;
}) {
  const words = book.synopsisText.trim() ? book.synopsisText.trim().split(/\s+/).length : 0;
  const preview = (synopsisMode === "TEXT" ? book.synopsisText : book.synopsisLink).replace(/\s+/g, " ").trim();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3" style={{ border: "1px solid var(--border)", background: "#fff" }}>
        <button
          type="button"
          onClick={() => setSynopsisOpen((value) => !value)}
          aria-expanded={synopsisOpen}
          aria-label={synopsisOpen ? "Свернуть синопсис" : "Развернуть синопсис"}
          className="grid h-8 w-8 place-items-center rounded-full"
          style={{ background: "var(--soft)" }}
        >
          <ChevronDown size={16} style={{ transform: synopsisOpen ? "rotate(180deg)" : undefined, transition: "transform 180ms ease" }} />
        </button>
        <span className="text-[14.5px] font-semibold">Синопсис</span>
        <div className="inline-flex rounded-full p-0.5" style={{ background: "var(--soft)" }} role="tablist" aria-label="Вид синопсиса">
          {([
            ["TEXT", "Текст"],
            ["LINK", "Ссылка"],
          ] as const).map(([mode, label]) => {
            const on = synopsisMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  if (on) return;
                  setSynopsisMode(mode);
                  startTransition(() => updateSynopsisMode(book.id, mode));
                }}
                className="h-7 rounded-full px-3 text-[13px]"
                style={{ background: on ? "#fff" : "transparent", color: "var(--ink)", fontWeight: on ? 650 : 500, boxShadow: on ? "0 1px 2px rgba(32,32,32,.08)" : undefined }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {!synopsisOpen && preview ? (
          <span className="min-w-[120px] flex-1 truncate text-[13px]" style={{ color: "var(--muted)" }}>{preview}</span>
        ) : (
          <span className="flex-1" />
        )}
        {synopsisMode === "TEXT" && words > 0 ? (
          <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            {words.toLocaleString("ru-RU").replace(/\u00A0/g, " ")} слов
          </span>
        ) : null}
      </div>
      {synopsisOpen && (
        <div className="mt-3 max-w-[680px]">
          {synopsisMode === "TEXT" ? (
            <SuggestableField model="Book" recordId={book.id} field="synopsisText" value={book.synopsisText}
              suggestion={suggestions.synopsisText} placeholder="Полный синопсис от начала до конца, со спойлерами..."
              className="reading w-full outline-none bg-transparent" style={{ minHeight: 120 }} />
          ) : (
            <SuggestableField model="Book" recordId={book.id} field="synopsisLink" value={book.synopsisLink}
              suggestion={suggestions.synopsisLink} as="input" placeholder="https://docs.google.com/..."
              className="w-full border-b py-1.5 outline-none bg-transparent text-[14px]" style={{ borderColor: "var(--rule)" }} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Основной компонент ───────────────────────────────────────────────────
export default function AboutBookForm({ book, suggestions, comments }: { book: Book; suggestions: Record<string, string>; comments: Comment[] }) {
  const [synopsisMode, setSynopsisMode] = useState(book.synopsisMode);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="max-w-[880px]">
      <div className="mb-8 rounded-[14px]" style={{ border: "1px solid var(--border)" }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row gap-8 items-start">
          <CoverCarousel
            recordId={book.id}
            slots={[
              { target: "book-cover", field: "coverUrl", posField: "coverPosition" },
              { target: "book-cover-2", field: "coverUrl2", posField: "coverPosition2" },
              { target: "book-cover-3", field: "coverUrl3", posField: "coverPosition3" },
            ]}
            initialUrls={[book.coverUrl ?? null, book.coverUrl2 ?? null, book.coverUrl3 ?? null]}
            initialPositions={[book.coverPosition ?? "50% 50%", book.coverPosition2 ?? "50% 50%", book.coverPosition3 ?? "50% 50%"]}
            onSavePosition={(posField, pos) => startTransition(() => { void updateBookPhotoPosition(book.id, posField as "coverPosition" | "coverPosition2" | "coverPosition3", pos); })}
          />
          <div className="flex-1 min-w-0 pt-1">
            <Field label="Название (рабочее)" value={book.title} field="title" bookId={book.id} suggestion={suggestions.title} />
            <TextAreaField label="Жанр" value={book.genre} field="genre" bookId={book.id} suggestion={suggestions.genre} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        <TextAreaField label="Референсы" value={book.references} field="references" bookId={book.id} suggestion={suggestions.references} />
        <TextAreaField label="Целевая аудитория" value={book.audience} field="audience" bookId={book.id} suggestion={suggestions.audience} />
        <Field label="Количество частей" value={book.partsCount} field="partsCount" bookId={book.id} suggestion={suggestions.partsCount} />
        <TextAreaField label="Временная структура" value={book.timeStructure} field="timeStructure" bookId={book.id} suggestion={suggestions.timeStructure} />
        <TextAreaField label="Главные герои" value={book.mainCharacters} field="mainCharacters" bookId={book.id} suggestion={suggestions.mainCharacters} />
        <TextAreaField label="Драматический аргумент" value={book.dramaticArgument} field="dramaticArgument" bookId={book.id} suggestion={suggestions.dramaticArgument} />
      </div>

      <TextAreaField label="Логлайн" value={book.logline} field="logline" bookId={book.id} suggestion={suggestions.logline} />
      <TextAreaField label="Концепт" value={book.concept} field="concept" bookId={book.id} suggestion={suggestions.concept} />
      <TextAreaField label="Аннотация" value={book.annotation} field="annotation" bookId={book.id} suggestion={suggestions.annotation} minHeight={80} />

      <SynopsisBlock book={book} suggestions={suggestions} synopsisMode={synopsisMode} setSynopsisMode={setSynopsisMode} synopsisOpen={synopsisOpen} setSynopsisOpen={setSynopsisOpen} startTransition={startTransition} />

      <CommentsBlock model="Book" recordId={book.id} initialComments={comments} />
    </div>
  );
}
