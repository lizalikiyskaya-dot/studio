"use client";

import { useState, useTransition, useRef } from "react";
import type { Book, Comment } from "@/generated/prisma/client";
import { ChevronLeft, ChevronRight, Camera, X, ImageIcon } from "lucide-react";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { updateSynopsisMode } from "./actions";

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
        className="w-full border-b py-1.5 text-[14px] outline-none bg-transparent resize-vertical" />
    </div>
  );
}

// ── Баннер ──────────────────────────────────────────────────────────────
function BannerSection({ bookId, initial }: { bookId: string; initial: string | null }) {
  const [url, setUrl] = useState(initial);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    startTransition(() => { void uploadFile("book-banner", bookId, "bannerUrl", file); });
  }

  return (
    <div
      className="relative w-full mb-0 overflow-hidden"
      style={{ height: 200, background: url ? undefined : "var(--bg-surface-2)", cursor: url ? "default" : "pointer", border: url ? "none" : "2px dashed var(--border)" }}
      onClick={() => !url && inputRef.current?.click()}
    >
      {url ? (
        <>
          <img src={url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)" }}
            >
              <Camera size={13} /> изменить фон
            </button>
            <button
              onClick={() => { setUrl(null); startTransition(() => { void deletePhoto("book-banner", bookId, "bannerUrl"); }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)" }}
            >
              <X size={13} /> удалить
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--ink-faint)" }}>
          <ImageIcon size={28} />
          <span className="text-[13px]">Добавить фоновое фото</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ── Карусель обложек ─────────────────────────────────────────────────────
const COVER_SLOTS = [
  { target: "book-cover" as const, field: "coverUrl" },
  { target: "book-cover-2" as const, field: "coverUrl2" },
  { target: "book-cover-3" as const, field: "coverUrl3" },
] as const;

function CoverCarousel({ bookId, initial }: { bookId: string; initial: [string | null, string | null, string | null] }) {
  const [covers, setCovers] = useState<[string | null, string | null, string | null]>(initial);
  const [active, setActive] = useState(0);
  const [, startTransition] = useTransition();
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const filled = covers.filter(Boolean).length;
  // Which slot to show (navigate only among loaded + 1 empty if <3)
  const slots = covers.map((url, i) => ({ url, idx: i })).filter((s, i) => s.url || i === filled);
  const visibleCount = Math.min(slots.length, 3);

  function handleFile(slotIdx: number, file: File) {
    const preview = URL.createObjectURL(file);
    setCovers((prev) => { const next = [...prev] as typeof prev; next[slotIdx] = preview; return next; });
    startTransition(() => { void uploadFile(COVER_SLOTS[slotIdx].target, bookId, COVER_SLOTS[slotIdx].field, file); });
    setActive(slotIdx);
  }

  function handleDelete(slotIdx: number) {
    setCovers((prev) => { const next = [...prev] as typeof prev; next[slotIdx] = null; return next; });
    startTransition(() => { void deletePhoto(COVER_SLOTS[slotIdx].target, bookId, COVER_SLOTS[slotIdx].field); });
    setActive(Math.max(0, slotIdx - 1));
  }

  const displayIdx = active < visibleCount ? active : 0;
  const currentSlot = slots[displayIdx];

  return (
    <div className="relative" style={{ width: 180, height: 260 }}>
      {/* current cover */}
      <div
        className="w-full h-full rounded-[10px] overflow-hidden relative"
        style={{
          background: currentSlot?.url ? undefined : "var(--bg-surface-2)",
          border: currentSlot?.url ? "none" : "2px dashed var(--border)",
          cursor: currentSlot?.url ? "default" : "pointer",
        }}
        onClick={() => !currentSlot?.url && inputRefs[currentSlot?.idx ?? 0].current?.click()}
      >
        {currentSlot?.url ? (
          <>
            <img src={currentSlot.url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <button
                onClick={() => inputRefs[currentSlot.idx].current?.click()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)" }}
              >
                <Camera size={11} /> заменить
              </button>
              <button
                onClick={() => handleDelete(currentSlot.idx)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium"
                style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)" }}
              >
                <X size={11} /> удалить
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--ink-faint)" }}>
            <ImageIcon size={22} />
            <span className="text-[11px] text-center leading-snug px-3">Добавить обложку {(currentSlot?.idx ?? 0) + 1}</span>
          </div>
        )}
        {COVER_SLOTS.map((slot, i) => (
          <input key={i} ref={inputRefs[i]} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(i, f); }} />
        ))}
      </div>

      {/* navigation arrows */}
      {visibleCount > 1 && (
        <>
          <button
            onClick={() => setActive((a) => (a - 1 + visibleCount) % visibleCount)}
            className="absolute left-[-14px] top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-md"
            style={{ width: 26, height: 26, background: "#fff", border: "1px solid var(--border)" }}
          >
            <ChevronLeft size={14} style={{ color: "var(--ink)" }} />
          </button>
          <button
            onClick={() => setActive((a) => (a + 1) % visibleCount)}
            className="absolute right-[-14px] top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-md"
            style={{ width: 26, height: 26, background: "#fff", border: "1px solid var(--border)" }}
          >
            <ChevronRight size={14} style={{ color: "var(--ink)" }} />
          </button>
        </>
      )}

      {/* dots */}
      {visibleCount > 1 && (
        <div className="absolute bottom-[-20px] left-0 right-0 flex justify-center gap-1.5">
          {Array.from({ length: visibleCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="rounded-full transition-all"
              style={{
                width: i === displayIdx ? 14 : 6,
                height: 6,
                background: i === displayIdx ? "var(--accent)" : "var(--border)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Основной компонент ───────────────────────────────────────────────────
export default function AboutBookForm({ book, suggestions, comments }: { book: Book; suggestions: Record<string, string>; comments: Comment[] }) {
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
      {/* Баннер + обложки */}
      <div className="mb-8 rounded-[14px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <BannerSection bookId={book.id} initial={book.bannerUrl ?? null} />
        <div className="px-6 pb-6 pt-8 flex gap-8 items-start">
          <CoverCarousel
            bookId={book.id}
            initial={[book.coverUrl ?? null, book.coverUrl2 ?? null, book.coverUrl3 ?? null]}
          />
          <div className="flex-1 min-w-0 pt-1">
            <Field label="Название (рабочее)" value={book.title} field="title" bookId={book.id} suggestion={suggestions.title} />
            <TextAreaField label="Жанр" value={book.genre} field="genre" bookId={book.id} suggestion={suggestions.genre} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8">
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

      <div className="max-w-[680px]">
        <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>Синопсис</label>
        <div className="rounded-md p-4" style={{ border: "1px solid var(--rule)" }}>
          <div className="flex items-center justify-between mb-2.5">
            <button onClick={() => setSynopsisOpen((v) => !v)} className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
              развернуть / свернуть
            </button>
            <button onClick={toggleSynopsisMode} className="text-[12.5px] underline" style={{ color: "var(--sage)" }}>
              переключить: текст / ссылка на Google Doc
            </button>
          </div>
          {synopsisOpen && (
            synopsisMode === "TEXT" ? (
              <SuggestableField model="Book" recordId={book.id} field="synopsisText" value={book.synopsisText}
                suggestion={suggestions.synopsisText} placeholder="Полный синопсис от начала до конца, со спойлерами..."
                className="w-full outline-none bg-transparent text-[14px]" style={{ minHeight: 120, lineHeight: 1.7 }} />
            ) : (
              <SuggestableField model="Book" recordId={book.id} field="synopsisLink" value={book.synopsisLink}
                suggestion={suggestions.synopsisLink} as="input" placeholder="https://docs.google.com/..."
                className="w-full border-b py-1.5 outline-none bg-transparent text-[14px]" style={{ borderColor: "var(--rule)" }} />
            )
          )}
        </div>
      </div>

      <CommentsBlock model="Book" recordId={book.id} initialComments={comments} />
    </div>
  );
}
