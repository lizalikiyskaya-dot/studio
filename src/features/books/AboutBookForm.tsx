"use client";

import { useState, useTransition } from "react";
import type { Book, Comment } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { uploadFile } from "@/lib/uploadFile";
import { updateSynopsisMode } from "./actions";

function Field({
  label,
  value,
  field,
  bookId,
  suggestion,
}: {
  label: string;
  value: string;
  field: string;
  bookId: string;
  suggestion?: string;
}) {
  return (
    <div className="mb-5">
      <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
        {label}
      </label>
      <SuggestableField
        model="Book"
        recordId={bookId}
        field={field}
        value={value}
        suggestion={suggestion}
        as="input"
        className="w-full border-b py-1.5 text-[15px] outline-none bg-transparent"
        style={{ borderColor: "var(--rule)" }}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  field,
  bookId,
  suggestion,
  minHeight = 60,
}: {
  label: string;
  value: string;
  field: string;
  bookId: string;
  suggestion?: string;
  minHeight?: number;
}) {
  return (
    <div className="mb-5 max-w-[680px]">
      <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
        {label}
      </label>
      <SuggestableField
        model="Book"
        recordId={bookId}
        field={field}
        value={value}
        suggestion={suggestion}
        style={{ borderColor: "var(--rule)", minHeight }}
        className="w-full border-b py-1.5 text-[14px] outline-none bg-transparent resize-vertical"
      />
    </div>
  );
}

export default function AboutBookForm({
  book,
  suggestions,
  comments,
}: {
  book: Book;
  suggestions: Record<string, string>;
  comments: Comment[];
}) {
  const [synopsisMode, setSynopsisMode] = useState(book.synopsisMode);
  const [synopsisOpen, setSynopsisOpen] = useState(true);
  const [, startTransition] = useTransition();

  function toggleSynopsisMode() {
    const next = synopsisMode === "TEXT" ? "LINK" : "TEXT";
    setSynopsisMode(next);
    startTransition(() => updateSynopsisMode(book.id, next));
  }

  return (
    <div>
      <ImageUploadBox
        value={book.coverUrl}
        onUpload={(file) => startTransition(() => { void uploadFile("book-cover", book.id, "coverUrl", file); })}
        placeholder="нажмите, чтобы добавить обложку"
        className="rounded-sm mb-6"
        style={{ width: 140, height: 200 }}
      />

      <div className="grid grid-cols-2 gap-x-8">
        <Field label="Название (рабочее)" value={book.title} field="title" bookId={book.id} suggestion={suggestions.title} />
        <Field label="Жанр" value={book.genre} field="genre" bookId={book.id} suggestion={suggestions.genre} />
        <Field label="Референсы" value={book.references} field="references" bookId={book.id} suggestion={suggestions.references} />
        <Field label="Целевая аудитория" value={book.audience} field="audience" bookId={book.id} suggestion={suggestions.audience} />
        <Field label="Количество частей" value={book.partsCount} field="partsCount" bookId={book.id} suggestion={suggestions.partsCount} />
        <Field label="Временная структура" value={book.timeStructure} field="timeStructure" bookId={book.id} suggestion={suggestions.timeStructure} />
        <Field label="Главные герои" value={book.mainCharacters} field="mainCharacters" bookId={book.id} suggestion={suggestions.mainCharacters} />
        <Field
          label="Драматический аргумент"
          value={book.dramaticArgument}
          field="dramaticArgument"
          bookId={book.id}
          suggestion={suggestions.dramaticArgument}
        />
      </div>

      <TextAreaField label="Логлайн" value={book.logline} field="logline" bookId={book.id} suggestion={suggestions.logline} />
      <TextAreaField label="Концепт" value={book.concept} field="concept" bookId={book.id} suggestion={suggestions.concept} />
      <TextAreaField
        label="Аннотация"
        value={book.annotation}
        field="annotation"
        bookId={book.id}
        suggestion={suggestions.annotation}
        minHeight={80}
      />

      <div className="max-w-[680px]">
        <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
          Синопсис
        </label>
        <div className="rounded-md p-4" style={{ border: "1px solid var(--rule)" }}>
          <div className="flex items-center justify-between mb-2.5">
            <button
              onClick={() => setSynopsisOpen((v) => !v)}
              className="text-[13px]"
              style={{ color: "var(--ink-soft)" }}
            >
              развернуть / свернуть
            </button>
            <button
              onClick={toggleSynopsisMode}
              className="text-[12.5px] underline"
              style={{ color: "var(--sage)" }}
            >
              переключить: текст / ссылка на Google Doc
            </button>
          </div>
          {synopsisOpen && (
            synopsisMode === "TEXT" ? (
              <SuggestableField
                model="Book"
                recordId={book.id}
                field="synopsisText"
                value={book.synopsisText}
                suggestion={suggestions.synopsisText}
                placeholder="Полный синопсис от начала до конца, со спойлерами..."
                className="w-full outline-none bg-transparent text-[14px]"
                style={{ minHeight: 120, lineHeight: 1.7 }}
              />
            ) : (
              <SuggestableField
                model="Book"
                recordId={book.id}
                field="synopsisLink"
                value={book.synopsisLink}
                suggestion={suggestions.synopsisLink}
                as="input"
                placeholder="https://docs.google.com/..."
                className="w-full border-b py-1.5 outline-none bg-transparent text-[14px]"
                style={{ borderColor: "var(--rule)" }}
              />
            )
          )}
        </div>
      </div>

      <CommentsBlock model="Book" recordId={book.id} initialComments={comments} />
    </div>
  );
}
