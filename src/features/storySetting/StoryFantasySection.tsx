"use client";

import { useRef, useState, useTransition } from "react";
import { Check, MapPin, Plus, ScrollText, Sparkles, Swords, Cog, Landmark, Bug, Languages, X } from "lucide-react";
import type { Story, StoryWorldEntry, WorldCategory } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import ImageUploadBox from "@/components/ImageUploadBox";
import { Button } from "@/components/ui/Button";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import {
  updateStoryFantasyText,
  createStoryWorldEntry,
  deleteStoryWorldEntry,
  updateStoryWorldEntryTitle,
  updateStoryWorldEntryBody,
} from "./actions";

const CATEGORIES: WorldCategory[] = ["LOCATIONS", "FACTIONS", "LORE", "TECHNOLOGY", "MAGIC", "HISTORY", "CREATURES", "LANGUAGES"];

export default function StoryFantasySection({
  story,
  storyId,
  initialEntries,
}: {
  story: Story;
  storyId: string;
  initialEntries: StoryWorldEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [filter, setFilter] = useState<"ALL" | "GENERAL" | WorldCategory>("ALL");

  function handleAddEntry(category: WorldCategory) {
    startTransition(async () => {
      const entry = await createStoryWorldEntry(storyId, category);
      setEntries((prev) => [...prev, entry]);
      setOpenEntryId(entry.id);
    });
  }

  function handleDeleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (openEntryId === id) setOpenEntryId(null);
    startTransition(() => deleteStoryWorldEntry(id));
  }

  function patchEntry(id: string, patch: Partial<StoryWorldEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function handleSaveEntry(id: string) {
    const title = titleRef.current?.textContent ?? "";
    const body = bodyRef.current?.value ?? "";
    patchEntry(id, { title, body });
    startTransition(() => {
      void updateStoryWorldEntryTitle(id, title);
      void updateStoryWorldEntryBody(id, body);
    });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }

  const openEntry = entries.find((e) => e.id === openEntryId) ?? null;
  const visibleEntries = filter === "ALL" || filter === "GENERAL" ? entries : entries.filter((entry) => entry.category === filter);

  return (
    <section className="rounded-[24px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <h2 className="text-[17px] font-semibold">Фэнтези мир</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <FilterChip on={filter === "ALL"} onClick={() => setFilter("ALL")}>Все заметки</FilterChip>
        {CATEGORIES.map((category) => (
          <FilterChip key={category} on={filter === category} onClick={() => setFilter(category)}>
            {CATEGORY_TEXT[category]}
          </FilterChip>
        ))}
        <FilterChip on={filter === "GENERAL"} onClick={() => setFilter("GENERAL")}>Общее</FilterChip>
      </div>
      {filter === "ALL" && (
        <AutoGrowTextarea
          defaultValue={story.fantasyNotes}
          placeholder="общий черновик по миру..."
          className="mt-3 w-full rounded-[14px] bg-transparent p-2.5 text-[13.5px] leading-relaxed outline-none"
          style={{ border: "1px solid var(--border)" }}
          onBlur={(value) => startTransition(() => updateStoryFantasyText(storyId, "fantasyNotes", value))}
        />
      )}
      {filter === "GENERAL" ? (
        <AutoGrowTextarea
          defaultValue={story.fantasyGeneral}
          placeholder="всё остальное..."
          className="mt-3 w-full rounded-[14px] bg-transparent p-2.5 text-[13.5px] leading-relaxed outline-none"
          style={{ border: "1px solid var(--border)" }}
          onBlur={(value) => startTransition(() => updateStoryFantasyText(storyId, "fantasyGeneral", value))}
        />
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {visibleEntries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setOpenEntryId(entry.id)}
              className="hover-lift flex gap-3 rounded-[16px] p-3 text-left"
              style={{ background: "var(--soft)" }}
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl" style={{ background: "#D5F3E7", color: "#14684B" }}>
                {CATEGORY_ICON[entry.category]}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">{entry.title || "Без названия"}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: "var(--ink2)" }}>
                  {CATEGORY_TEXT[entry.category]}{entry.body ? ` · ${entry.body}` : ""}
                </span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleAddEntry(filter === "ALL" ? "LOCATIONS" : filter)}
            className="mt-1 inline-flex items-center gap-1.5 text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            <Plus size={14} /> добавить запись
          </button>
        </div>
      )}

      {openEntry && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpenEntryId(null);
          }}
          className="fixed inset-0 flex items-stretch justify-end z-[100]"
          style={{ background: "rgba(22,22,22,0.45)" }}
        >
          <div className="bg-white w-full max-w-[520px] h-full overflow-y-auto p-9 relative" style={{ boxShadow: "-8px 0 28px rgba(0,0,0,0.18)" }}>
            <button type="button" onClick={() => setOpenEntryId(null)} className="absolute top-[18px] right-[22px]" style={{ color: "var(--faded)" }}>
              <X size={20} />
            </button>
            <ImageUploadBox
              value={openEntry.photoUrl}
              onUpload={(file) => {
                patchEntry(openEntry.id, { photoUrl: URL.createObjectURL(file) });
                startTransition(() => { void uploadFile("story-world-entry-photo", openEntry.id, "photoUrl", file); });
              }}
              onDelete={() => {
                patchEntry(openEntry.id, { photoUrl: null });
                startTransition(() => { void deletePhoto("story-world-entry-photo", openEntry.id, "photoUrl"); });
              }}
              placeholder="фото"
              className="w-full h-[200px] rounded-[14px] mb-5 mt-3.5"
            />
            <div key={openEntry.id} ref={titleRef} contentEditable suppressContentEditableWarning className="heading font-semibold text-[24px] mb-4 pb-1">
              {openEntry.title}
            </div>
            <textarea
              key={openEntry.id + "-body"}
              ref={bodyRef}
              defaultValue={openEntry.body}
              placeholder="Описание, детали, всё, что нужно об этой записи..."
              className="w-full text-[14.5px] leading-relaxed rounded-[14px] p-3.5 resize-none"
              style={{ border: "1px solid var(--rule)", minHeight: "calc(100vh - 480px)" }}
            />
            <div className="mt-3.5 flex items-center gap-3">
              <Button type="button" variant="primary" size="sm" pill onClick={() => handleSaveEntry(openEntry.id)}>Сохранить</Button>
              {justSaved && (
                <span className="flex items-center gap-1 text-[12.5px]" style={{ color: "var(--sage)" }}>
                  <Check size={13} /> сохранено
                </span>
              )}
              <button type="button" onClick={() => handleDeleteEntry(openEntry.id)} className="text-[12.5px] px-3 py-1.5 rounded-full" style={{ border: "1px solid var(--border)", color: "var(--ink2)" }}>
                удалить запись
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const CATEGORY_TEXT: Record<WorldCategory, string> = {
  LOCATIONS: "Локации",
  FACTIONS: "Фракции",
  LORE: "Лор",
  TECHNOLOGY: "Технологии",
  MAGIC: "Магия / Система",
  HISTORY: "История",
  CREATURES: "Существа",
  LANGUAGES: "Языки",
};

const CATEGORY_ICON: Record<WorldCategory, React.ReactNode> = {
  LOCATIONS: <MapPin size={16} />,
  FACTIONS: <Swords size={16} />,
  LORE: <ScrollText size={16} />,
  TECHNOLOGY: <Cog size={16} />,
  MAGIC: <Sparkles size={16} />,
  HISTORY: <Landmark size={16} />,
  CREATURES: <Bug size={16} />,
  LANGUAGES: <Languages size={16} />,
};

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1 text-[12.5px]"
      style={on ? { background: "var(--ink)", color: "#fff" } : { background: "var(--soft)", color: "var(--ink2)" }}
    >
      {children}
    </button>
  );
}
