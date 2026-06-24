"use client";

import { useRef, useState, useTransition } from "react";
import type { Book, WorldEntry, WorldCategory } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import ImageUploadBox from "@/components/ImageUploadBox";
import {
  toggleFantasyLock,
  updateFantasyText,
  createWorldEntry,
  deleteWorldEntry,
  updateWorldEntryTitle,
  updateWorldEntryBody,
  updateWorldEntryPhoto,
} from "./actions";

const CATEGORY_LABELS: Record<WorldCategory, string> = {
  LOCATIONS: "🗺️ Локации",
  FACTIONS: "⚔️ Фракции",
  LORE: "📜 Лор",
  TECHNOLOGY: "⚙️ Технологии",
  MAGIC: "✨ Магия / Система",
  HISTORY: "🏛️ История",
  CREATURES: "🐉 Существа",
  LANGUAGES: "🔤 Языки",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as WorldCategory[];

export default function FantasySection({
  bookId,
  book,
  initialEntries,
  isMentor,
}: {
  bookId: string;
  book: Book;
  initialEntries: WorldEntry[];
  isMentor: boolean;
}) {
  const [unlocked, setUnlocked] = useState(book.fantasyUnlocked);
  const [entries, setEntries] = useState(initialEntries);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function handleToggleLock() {
    setUnlocked((v) => !v);
    startTransition(() => {
      void toggleFantasyLock(bookId);
    });
  }

  function handleAddEntry(category: WorldCategory) {
    startTransition(async () => {
      const entry = await createWorldEntry(bookId, category);
      setEntries((prev) => [...prev, entry]);
      setOpenEntryId(entry.id);
    });
  }

  function handleDeleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (openEntryId === id) setOpenEntryId(null);
    startTransition(() => deleteWorldEntry(id));
  }

  function patchEntry(id: string, patch: Partial<WorldEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function handleSaveEntry(id: string) {
    const title = titleRef.current?.textContent ?? "";
    const body = bodyRef.current?.value ?? "";
    patchEntry(id, { title, body });
    startTransition(() => {
      void updateWorldEntryTitle(id, title);
      void updateWorldEntryBody(id, body);
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }

  if (!unlocked) {
    return (
      <div
        className="rounded-md p-9 text-center max-w-[480px]"
        style={{ border: "1px dashed var(--rule)", color: "var(--faded)" }}
      >
        <span className="block text-[26px] mb-2.5">🔒</span>
        <span className="text-[13.5px]">Раздел скрыт от ученика — открой, если он пишет фэнтези</span>
        {isMentor && (
          <div className="mt-3.5">
            <button
              onClick={handleToggleLock}
              className="font-mono-label text-[11px] px-3 py-1.5 rounded-full"
              style={{ border: "1px solid var(--sage)", color: "var(--sage)" }}
            >
              Открыть мир
            </button>
          </div>
        )}
      </div>
    );
  }

  const openEntry = entries.find((e) => e.id === openEntryId) ?? null;

  return (
    <div>
      {isMentor && (
        <div className="mb-3.5">
          <button
            onClick={handleToggleLock}
            className="font-mono-label text-[11px] px-3 py-1.5 rounded-full"
            style={{ border: "1px solid var(--sage)", color: "var(--sage)" }}
          >
            🔓 Открыто для ученика — закрыть
          </button>
        </div>
      )}

      <Accordion title="📋 Все заметки" defaultOpen>
        <AutoGrowTextarea
          defaultValue={book.fantasyNotes}
          placeholder="общий черновик по миру..."
          className="w-full text-[13.5px] leading-relaxed rounded-md p-2.5"
          style={{ border: "1px solid var(--rule)" }}
          onBlur={(value) => startTransition(() => updateFantasyText(bookId, "fantasyNotes", value))}
        />
      </Accordion>

      {CATEGORIES.map((category) => {
        const categoryEntries = entries.filter((e) => e.category === category);
        return (
          <Accordion key={category} title={CATEGORY_LABELS[category]}>
            <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))" }}>
              {categoryEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setOpenEntryId(entry.id)}
                  className="rounded-md p-2.5 bg-white cursor-pointer"
                  style={{ border: "1px solid var(--rule)" }}
                >
                  <div
                    className="w-full h-20 rounded-sm mb-2"
                    style={{
                      border: "1px dashed var(--rule)",
                      backgroundImage: entry.photoUrl ? `url(${entry.photoUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="heading text-[13px] font-semibold">{entry.title}</div>
                </div>
              ))}
              <div
                onClick={() => handleAddEntry(category)}
                className="rounded-md flex items-center justify-center cursor-pointer text-center"
                style={{ border: "1px dashed var(--rule)", minHeight: 124, color: "var(--faded)" }}
              >
                <span className="font-mono-label text-[11px]">+ добавить</span>
              </div>
            </div>
          </Accordion>
        );
      })}

      <Accordion title="📌 Общее">
        <AutoGrowTextarea
          defaultValue={book.fantasyGeneral}
          placeholder="всё остальное..."
          className="w-full text-[13.5px] leading-relaxed rounded-md p-2.5"
          style={{ border: "1px solid var(--rule)" }}
          onBlur={(value) => startTransition(() => updateFantasyText(bookId, "fantasyGeneral", value))}
        />
      </Accordion>

      {openEntry && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenEntryId(null);
          }}
          className="fixed inset-0 flex items-stretch justify-end z-[100]"
          style={{ background: "rgba(22,22,22,0.45)" }}
        >
          <div className="bg-white w-full max-w-[520px] h-full overflow-y-auto p-9 relative" style={{ boxShadow: "-8px 0 28px rgba(0,0,0,0.18)" }}>
            <button
              onClick={() => setOpenEntryId(null)}
              className="absolute top-[18px] right-[22px] text-[24px] leading-none cursor-pointer"
              style={{ color: "var(--faded)", border: "none", background: "transparent" }}
            >
              ×
            </button>

            <ImageUploadBox
              value={openEntry.photoUrl}
              onUpload={(dataUrl) => {
                patchEntry(openEntry.id, { photoUrl: dataUrl });
                startTransition(() => updateWorldEntryPhoto(openEntry.id, dataUrl));
              }}
              placeholder="нажмите, чтобы добавить изображение"
              className="w-full h-[200px] rounded-md mb-5 mt-3.5"
            />

            <div
              key={openEntry.id}
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              className="heading font-semibold text-[24px] mb-4 pb-1"
              style={{ borderBottom: "1px solid transparent" }}
            >
              {openEntry.title}
            </div>

            <textarea
              key={openEntry.id + "-body"}
              ref={bodyRef}
              defaultValue={openEntry.body}
              placeholder="Описание, детали, всё, что нужно об этой записи..."
              className="w-full text-[14.5px] leading-relaxed rounded-md p-3.5 resize-none"
              style={{ border: "1px solid var(--rule)", minHeight: "calc(100vh - 480px)" }}
            />

            <div className="mt-3.5 flex items-center gap-3">
              <button
                onClick={() => handleSaveEntry(openEntry.id)}
                className="font-mono-label text-[11px] px-4 py-1.5 rounded-full"
                style={{ border: "1px solid var(--sage)", color: "#fff", background: "var(--sage)" }}
              >
                Сохранить
              </button>
              {justSaved && (
                <span className="font-mono-label text-[10.5px]" style={{ color: "var(--sage)" }}>
                  ✓ сохранено
                </span>
              )}
              <button
                onClick={() => handleDeleteEntry(openEntry.id)}
                className="font-mono-label text-[11px] px-3 py-1.5 rounded-full"
                style={{ border: "1px dashed var(--wine-soft)", color: "var(--wine)" }}
              >
                удалить запись
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
