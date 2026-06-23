"use client";

import { useState, useTransition } from "react";
import type { Book } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import { updateBookField, updateSynopsisMode, type BookTextField } from "./actions";

function Field({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
}) {
  return (
    <div className="mb-5">
      <label className="block font-mono-label text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
        {label}
      </label>
      <input
        defaultValue={value}
        onBlur={(e) => onSave(e.target.value)}
        className="w-full border-b py-1.5 text-[15px] outline-none bg-transparent"
        style={{ borderColor: "var(--rule)" }}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onSave,
  minHeight = 60,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  minHeight?: number;
}) {
  return (
    <div className="mb-5 max-w-[680px]">
      <label className="block font-mono-label text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
        {label}
      </label>
      <textarea
        defaultValue={value}
        onBlur={(e) => onSave(e.target.value)}
        style={{ borderColor: "var(--rule)", minHeight }}
        className="w-full border-b py-1.5 text-[14px] outline-none bg-transparent resize-vertical"
      />
    </div>
  );
}

export default function AboutBookForm({ book }: { book: Book }) {
  const [synopsisMode, setSynopsisMode] = useState(book.synopsisMode);
  const [synopsisOpen, setSynopsisOpen] = useState(true);
  const [, startTransition] = useTransition();

  function save(field: BookTextField, value: string) {
    startTransition(() => updateBookField(book.id, field, value));
  }

  function toggleSynopsisMode() {
    const next = synopsisMode === "TEXT" ? "LINK" : "TEXT";
    setSynopsisMode(next);
    startTransition(() => updateSynopsisMode(book.id, next));
  }

  return (
    <div>
      <ImageUploadBox
        value={book.coverUrl}
        onUpload={(dataUrl) => save("coverUrl", dataUrl)}
        placeholder="нажмите, чтобы добавить обложку"
        className="rounded-sm mb-6"
        style={{ width: 140, height: 200 }}
      />

      <div className="grid grid-cols-2 gap-x-8">
        <Field label="Название (рабочее)" value={book.title} onSave={(v) => save("title", v)} />
        <Field label="Жанр" value={book.genre} onSave={(v) => save("genre", v)} />
        <Field label="Референсы" value={book.references} onSave={(v) => save("references", v)} />
        <Field label="Целевая аудитория" value={book.audience} onSave={(v) => save("audience", v)} />
        <Field label="Количество частей" value={book.partsCount} onSave={(v) => save("partsCount", v)} />
        <Field label="Временная структура" value={book.timeStructure} onSave={(v) => save("timeStructure", v)} />
        <Field label="Главные герои" value={book.mainCharacters} onSave={(v) => save("mainCharacters", v)} />
        <Field
          label="Драматический аргумент"
          value={book.dramaticArgument}
          onSave={(v) => save("dramaticArgument", v)}
        />
      </div>

      <TextAreaField label="Логлайн" value={book.logline} onSave={(v) => save("logline", v)} />
      <TextAreaField label="Концепт" value={book.concept} onSave={(v) => save("concept", v)} />
      <TextAreaField
        label="Аннотация"
        value={book.annotation}
        onSave={(v) => save("annotation", v)}
        minHeight={80}
      />

      <div className="max-w-[680px]">
        <label className="block font-mono-label text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
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
              className="font-mono-label text-[10px] underline"
              style={{ color: "var(--sage)" }}
            >
              переключить: текст / ссылка на Google Doc
            </button>
          </div>
          {synopsisOpen && (
            synopsisMode === "TEXT" ? (
              <textarea
                defaultValue={book.synopsisText}
                onBlur={(e) => save("synopsisText", e.target.value)}
                placeholder="Полный синопсис от начала до конца, со спойлерами..."
                className="w-full outline-none bg-transparent text-[14px] resize-vertical"
                style={{ minHeight: 120, lineHeight: 1.7 }}
              />
            ) : (
              <input
                defaultValue={book.synopsisLink}
                onBlur={(e) => save("synopsisLink", e.target.value)}
                placeholder="https://docs.google.com/..."
                className="w-full border-b py-1.5 outline-none bg-transparent text-[14px]"
                style={{ borderColor: "var(--rule)" }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
