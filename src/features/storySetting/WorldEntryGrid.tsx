"use client";

import { useRef, useState, useTransition } from "react";
import type { WorldCategory } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import { uploadFile } from "@/lib/uploadFile";

export type WorldEntryLike = {
  id: string;
  category: WorldCategory;
  title: string;
  body: string;
  photoUrl: string | null;
};

const CATEGORY_LABELS: Record<WorldCategory, string> = {
  LOCATIONS: "Локации",
  FACTIONS: "Фракции",
  LORE: "Лор",
  TECHNOLOGY: "Технологии",
  MAGIC: "Магия / Система",
  HISTORY: "История",
  CREATURES: "Существа",
  LANGUAGES: "Языки",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as WorldCategory[];

export default function WorldEntryGrid({
  entries: initialEntries,
  uploadTarget,
  onCreate,
  onDelete,
  onUpdateTitle,
  onUpdateBody,
}: {
  entries: WorldEntryLike[];
  uploadTarget: "cycle-world-entry-photo" | "story-world-entry-photo";
  onCreate: (category: WorldCategory) => Promise<WorldEntryLike>;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateBody: (id: string, body: string) => void;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function handleAddEntry(category: WorldCategory) {
    startTransition(async () => {
      const entry = await onCreate(category);
      setEntries((prev) => [...prev, entry]);
      setOpenEntryId(entry.id);
    });
  }

  function handleDeleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (openEntryId === id) setOpenEntryId(null);
    onDelete(id);
  }

  function patchEntry(id: string, patch: Partial<WorldEntryLike>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function handleSaveEntry(id: string) {
    const title = titleRef.current?.textContent ?? "";
    const body = bodyRef.current?.value ?? "";
    patchEntry(id, { title, body });
    onUpdateTitle(id, title);
    onUpdateBody(id, body);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }

  const openEntry = entries.find((e) => e.id === openEntryId) ?? null;

  return (
    <div>
      {CATEGORIES.map((category) => {
        const categoryEntries = entries.filter((e) => e.category === category);
        return (
          <div key={category} className="mb-6">
            <div className="text-[13px] font-semibold mb-2.5">{CATEGORY_LABELS[category]}</div>
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
                <span className="text-[12.5px]">+ добавить</span>
              </div>
            </div>
          </div>
        );
      })}

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
              onUpload={(file) => {
                patchEntry(openEntry.id, { photoUrl: URL.createObjectURL(file) });
                startTransition(() => { void uploadFile(uploadTarget, openEntry.id, "photoUrl", file); });
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
              className="field-literary w-full text-[14.5px] leading-relaxed rounded-md p-3.5 resize-none"
              style={{ border: "1px solid var(--rule)", minHeight: "calc(100vh - 480px)" }}
            />

            <div className="mt-3.5 flex items-center gap-3">
              <button
                onClick={() => handleSaveEntry(openEntry.id)}
                className="text-[12.5px] px-4 py-1.5 rounded-full"
                style={{ border: "1px solid var(--sage)", color: "#fff", background: "var(--sage)" }}
              >
                Сохранить
              </button>
              {justSaved && (
                <span className="text-[12.5px]" style={{ color: "var(--sage)" }}>
                  ✓ сохранено
                </span>
              )}
              <button
                onClick={() => handleDeleteEntry(openEntry.id)}
                className="text-[12.5px] px-3 py-1.5 rounded-full"
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
