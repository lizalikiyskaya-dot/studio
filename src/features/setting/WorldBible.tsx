"use client";

import { useEffect, useState, useTransition } from "react";
import type { WorldCategory } from "@/generated/prisma/client";
import { siteConfirm } from "@/components/SiteDialog";
import ToggleSwitch from "@/components/ToggleSwitch";
import ImageUploadBox from "@/components/ImageUploadBox";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { Button } from "@/components/ui/Button";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import {
  BIBLE_THEMES,
  GRAPES_FIELDS,
  entryLabel,
  isEntryCategory,
  nextThemeCue,
  themeFill,
  type BibleTheme,
  type Fill,
  type GrapesBag,
  type GrapesField,
} from "./worldBible";
import {
  createGrapesSetting,
  createWorldEntry,
  deleteGrapesSetting,
  deleteWorldEntry,
  toggleFantasyLock,
  updateWorldEntryBody,
  updateWorldEntryCategory,
  updateWorldEntryTitle,
} from "./actions";
import {
  createCycleWorldEntry,
  createStoryWorldEntry,
  deleteCycleWorldEntry,
  deleteStoryWorldEntry,
  toggleCycleFantasyLock,
  updateCycleWorldEntryBody,
  updateCycleWorldEntryCategory,
  updateCycleWorldEntryTitle,
  updateStoryFantasyText,
  updateStoryGrapesField,
  updateStoryWorldEntryBody,
  updateStoryWorldEntryCategory,
  updateStoryWorldEntryTitle,
} from "@/features/storySetting/actions";

export type BibleEntry = {
  id: string;
  category: WorldCategory;
  title: string;
  body: string;
  photoUrl: string | null;
};

export type BibleTable = {
  id: string;
  title: string;
  model: "Book" | "GrapesSetting" | "Cycle" | "Story";
  recordId: string;
  values: GrapesBag;
  suggestions: Record<string, string>;
  titleField: "grapesTitle" | "title" | null;
};

type PhotoKind = "world-entry-photo" | "cycle-world-entry-photo" | "story-world-entry-photo";
type Scope = "book" | "cycle" | "story";

const fieldClass =
  "w-full rounded-[14px] border bg-white p-3 text-[16px] leading-relaxed outline-none";

export default function WorldBible({
  scope,
  recordId,
  tables: initialTables,
  entries: initialEntries,
  fantasyGeneral,
  fantasyNotes,
  fantasySuggestions,
  canEdit,
  allowTables,
  isMentor,
  unlocked: initialUnlocked,
  photoKind,
}: {
  scope: Scope;
  recordId: string;
  tables: BibleTable[];
  entries: BibleEntry[];
  fantasyGeneral: string;
  fantasyNotes: string;
  fantasySuggestions?: Record<string, string>;
  canEdit: boolean;
  allowTables: boolean;
  isMentor: boolean;
  unlocked: boolean;
  photoKind: PhotoKind;
}) {
  const [tables, setTables] = useState(initialTables);
  const [tableId, setTableId] = useState(initialTables[0]?.id ?? "primary");
  const [entries, setEntries] = useState(initialEntries);
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [openTheme, setOpenTheme] = useState<BibleTheme | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const table = tables.find((item) => item.id === tableId) ?? tables[0];
  const grapes = table?.values ?? emptyGrapes();
  const entriesVisible = scope === "story" || unlocked;
  const cue = nextThemeCue(grapes, entriesVisible ? entries : [], entriesVisible);
  const themeEntries = openTheme?.category ? entries.filter((entry) => entry.category === openTheme.category) : [];
  const selected = themeEntries.find((entry) => entry.id === selectedId) ?? themeEntries[0] ?? null;

  useEffect(() => {
    if (!openTheme) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openTheme]);

  function openChip(theme: BibleTheme) {
    const entriesVisibleNow = scope === "story" || unlocked;
    setOpenTheme(theme);
    setSelectedId(null);
    setNotesOpen(entriesVisibleNow && !window.matchMedia("(max-width: 700px)").matches);
  }

  function closeSheet() {
    setOpenTheme(null);
    setNotesOpen(false);
  }

  function patchGrapes(field: GrapesField, value: string) {
    if (!table) return;
    setTables((prev) => prev.map((item) => (
      item.id === table.id ? { ...item, values: { ...item.values, [field]: value } } : item
    )));
  }

  function handleAddTable() {
    if (scope !== "book" || !canEdit) return;
    startTransition(async () => {
      const created = await createGrapesSetting(recordId);
      const next: BibleTable = {
        id: created.id,
        title: created.title.trim() ? created.title : `Сеттинг ${tables.length + 1}`,
        model: "GrapesSetting",
        recordId: created.id,
        values: pickGrapes(created),
        suggestions: {},
        titleField: "title",
      };
      setTables((prev) => [...prev, next]);
      setTableId(created.id);
    });
  }

  async function handleDeleteTable() {
    if (!table || table.id === "primary" || !canEdit) return;
    if (!(await siteConfirm("Удалить эту таблицу?"))) return;
    const id = table.recordId;
    setTables((prev) => prev.filter((item) => item.id !== table.id));
    setTableId("primary");
    startTransition(() => deleteGrapesSetting(id));
  }

  function handleToggleLock() {
    setUnlocked((value) => !value);
    startTransition(() => {
      if (scope === "cycle") void toggleCycleFantasyLock(recordId);
      else void toggleFantasyLock(recordId);
    });
  }

  function handleAddEntry() {
    if (!canEdit || !openTheme?.category) return;
    const category = openTheme.category;
    startTransition(async () => {
      const created = scope === "cycle"
        ? await createCycleWorldEntry(recordId, category)
        : scope === "story"
          ? await createStoryWorldEntry(recordId, category)
          : await createWorldEntry(recordId, category);
      setEntries((prev) => [...prev, created]);
      setSelectedId(created.id);
    });
  }

  function handleDeleteEntry(id: string) {
    if (!canEdit) return;
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    if (selectedId === id) setSelectedId(null);
    startTransition(() => {
      if (scope === "cycle") void deleteCycleWorldEntry(id);
      else if (scope === "story") void deleteStoryWorldEntry(id);
      else void deleteWorldEntry(id);
    });
  }

  function handleSaveEntry(id: string, title: string, body: string) {
    if (!canEdit) return;
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, title, body } : entry)));
    startTransition(() => {
      if (scope === "cycle") {
        void updateCycleWorldEntryTitle(id, title);
        void updateCycleWorldEntryBody(id, body);
      } else if (scope === "story") {
        void updateStoryWorldEntryTitle(id, title);
        void updateStoryWorldEntryBody(id, body);
      } else {
        void updateWorldEntryTitle(id, title);
        void updateWorldEntryBody(id, body);
      }
    });
  }

  function handleCategory(id: string, category: WorldCategory) {
    if (!canEdit || !isEntryCategory(category)) return;
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, category } : entry)));
    startTransition(() => {
      if (scope === "cycle") void updateCycleWorldEntryCategory(id, category);
      else if (scope === "story") void updateStoryWorldEntryCategory(id, category);
      else void updateWorldEntryCategory(id, category);
    });
  }

  const bodies = new Map<WorldCategory, string[]>();
  for (const entry of entries) {
    const list = bodies.get(entry.category) ?? [];
    list.push(entry.body);
    bodies.set(entry.category, list);
  }

  const grapesThemes = BIBLE_THEMES.filter((theme) => theme.kind === "grapes");
  const entryThemes = BIBLE_THEMES.filter((theme) => theme.kind === "entry");

  return (
    <section className="rounded-[24px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[17px] font-semibold">Библия мира</h2>
        {allowTables && table ? (
          <label className="ml-auto flex items-center gap-2 rounded-[12px] px-2.5 py-1" style={{ border: "1px solid var(--border)" }}>
            <span className="text-[12px]" style={{ color: "var(--muted)" }}>Таблица</span>
            <select
              aria-label="Таблица"
              className="bg-transparent text-[13px] font-medium outline-none"
              value={table.id}
              onChange={(event) => setTableId(event.target.value)}
            >
              {tables.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
        ) : null}
        {isMentor && scope !== "story" ? (
          <span className={`flex items-center gap-2 text-[12.5px] ${allowTables ? "" : "ml-auto"}`} style={{ color: "var(--muted)" }}>
            открыт наставником
            <ToggleSwitch checked={unlocked} onChange={handleToggleLock} />
          </span>
        ) : null}
      </div>

      {cue ? (
        <p className="mt-2.5 text-[13px]" style={{ color: "var(--ink2)" }}>
          <span className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full align-middle" style={{ background: "#FFD43B" }} />
          Дальше: {cue}
        </p>
      ) : null}

      {allowTables && canEdit ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {table?.titleField && table.model !== "Story" ? (
            <SuggestableField
              key={`${table.recordId}-${table.titleField}`}
              model={table.model}
              recordId={table.recordId}
              field={table.titleField}
              value={table.title}
              suggestion={table.suggestions[table.titleField]}
              as="input"
              placeholder="название таблицы"
              ariaLabel="Название таблицы"
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium outline-none"
              onSaved={(title) => setTables((prev) => prev.map((item) => item.id === table.id ? { ...item, title: title.trim() || item.title } : item))}
            />
          ) : null}
          <button type="button" onClick={handleAddTable} className="text-[13px]" style={{ color: "var(--muted)" }}>+ таблица</button>
          {table && table.id !== "primary" ? (
            <button type="button" onClick={() => void handleDeleteTable()} className="text-[13px]" style={{ color: "var(--link)" }}>удалить таблицу</button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 text-[12px]" style={{ color: "var(--muted)" }}>Метод GRAPES</div>
      <div className="bible-chips mt-1.5">
        {grapesThemes.map((theme) => (
          <ThemeChip
            key={theme.id}
            theme={theme}
            fill={themeFill(theme, grapes, bodies)}
            active={openTheme?.id === theme.id}
            onClick={() => openChip(theme)}
          />
        ))}
      </div>

      {entriesVisible ? (
        <>
          <div className="mt-3 text-[12px]" style={{ color: "var(--muted)" }}>Записи</div>
          <div className="bible-chips mt-1.5">
            {entryThemes.map((theme) => (
              <ThemeChip
                key={theme.id}
                theme={theme}
                fill={themeFill(theme, grapes, bodies)}
                active={openTheme?.id === theme.id}
                onClick={() => openChip(theme)}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="mt-3 text-[13.5px]" style={{ color: "var(--muted)" }}>
          Записи мира скрыты. Включите, если здесь есть фэнтези.
        </p>
      )}

      {openTheme && table ? (
        <div className="fixed inset-0 z-[90] flex items-end" style={{ background: "rgba(22,22,22,0.45)" }} onClick={closeSheet}>
          <div
            className="bible-sheet relative flex h-[100dvh] w-full md:mx-auto md:mb-0 md:h-[min(78vh,760px)] md:max-w-[1080px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-w-0 flex-1 overflow-y-auto bg-white px-4 py-3 md:rounded-t-[22px] md:px-5 md:py-4">
              <div className="mx-auto mb-3 hidden h-1 w-9 rounded-full md:block" style={{ background: "#E8E1DC" }} />
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeSheet} className="text-[13px]" style={{ color: "var(--ink2)" }}>← все темы</button>
                {entriesVisible ? (
                  <button type="button" onClick={() => setNotesOpen(true)} className="ml-auto text-[13px] md:hidden" style={{ color: "var(--ink2)" }}>Заметки</button>
                ) : null}
              </div>
              <h3 className="mt-2 text-[22px] font-semibold leading-tight">
                {openTheme.badge ? <span className="mr-2 text-[14px]" style={{ color: "var(--muted)" }}>{openTheme.badge}</span> : null}
                {openTheme.label}
              </h3>
              <div className="mt-3 rounded-[16px] px-3.5 py-3" style={{ background: "#F8F4F1" }}>
                <div className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>Подсказки</div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {openTheme.hints.map((hint) => (
                    <li key={hint} className="text-[13px] leading-snug" style={{ color: "var(--ink2)" }}>{hint}</li>
                  ))}
                </ul>
              </div>

              {openTheme.kind === "grapes" && openTheme.field ? (
                <div className="mt-4">
                  <GrapesText
                    table={table}
                    field={openTheme.field}
                    canEdit={canEdit}
                    onSaved={(value) => patchGrapes(openTheme.field!, value)}
                  />
                  <p className="mt-2 text-[12.5px]" style={{ color: "var(--muted)" }}>У этого текста нет фото. Фото добавляется в записи.</p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {themeEntries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className="flex items-center gap-3 rounded-[16px] p-2.5 text-left"
                      style={{ background: selected?.id === entry.id ? "#E8E1DC" : "var(--soft)" }}
                    >
                      {entry.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.photoUrl} alt="" className="h-12 w-14 rounded-[10px] object-cover" />
                      ) : (
                        <span className="grid h-12 w-14 place-items-center rounded-[10px] text-[11px]" style={{ background: "#F8F4F1", color: "var(--muted)" }}>фото</span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold">{entry.title || "Без названия"}</span>
                        <span className="mt-0.5 block truncate text-[12.5px]" style={{ color: "var(--ink2)" }}>{entry.body || "текст не начат"}</span>
                      </span>
                    </button>
                  ))}
                  {canEdit ? (
                    <button type="button" onClick={handleAddEntry} className="self-start text-[13px]" style={{ color: "var(--muted)" }}>+ запись</button>
                  ) : null}
                  {selected ? (
                    <EntryEditor
                      key={selected.id}
                      entry={selected}
                      canEdit={canEdit}
                      photoKind={photoKind}
                      onSave={handleSaveEntry}
                      onDelete={handleDeleteEntry}
                      onCategory={handleCategory}
                      onPhoto={(photoUrl) => setEntries((prev) => prev.map((entry) => entry.id === selected.id ? { ...entry, photoUrl } : entry))}
                    />
                  ) : (
                    <p className="text-[13px]" style={{ color: "var(--muted)" }}>Пока нет записей.</p>
                  )}
                </div>
              )}
            </div>

            {notesOpen && entriesVisible ? (
              <aside
                className="bible-note absolute inset-y-0 right-0 z-10 w-[min(300px,86%)] overflow-y-auto px-3.5 py-4 md:static md:w-[300px] md:shrink-0"
                style={{ background: "#fff5cc", boxShadow: "-12px 0 28px rgba(122,106,30,0.16)" }}
                aria-label="Заметки"
              >
                <div className="mb-2 flex items-center justify-between md:hidden">
                  <span className="text-[13px] font-semibold" style={{ color: "#7a6a1e" }}>Заметки</span>
                  <button type="button" onClick={() => setNotesOpen(false)} className="text-[13px]" style={{ color: "#7a6a1e" }}>закрыть</button>
                </div>
                <StickyTexts
                  scope={scope}
                  recordId={recordId}
                  canEdit={canEdit}
                  fantasyGeneral={fantasyGeneral}
                  fantasyNotes={fantasyNotes}
                  suggestions={fantasySuggestions}
                />
                <p className="mt-2 text-[11.5px] leading-snug" style={{ color: "#7a6a1e" }}>Одни на весь мир, не к этой теме.</p>
              </aside>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ThemeChip({ theme, fill, active, onClick }: { theme: BibleTheme; fill: Fill; active: boolean; onClick: () => void }) {
  const width = fill === "full" ? "100%" : fill === "partial" ? "42%" : "0%";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex flex-col gap-1.5 rounded-[14px] px-2.5 py-2 text-left md:min-w-[132px]"
      style={active
        ? { background: "#202020", color: "#fff" }
        : fill === "empty"
          ? { background: "#fff", color: "#202020", border: "1px dashed #E8E1DC" }
          : { background: "#f4f4f4", color: "#555" }}
    >
      <span className="flex items-center gap-1.5 text-[13px] font-medium">
        {theme.label}
        {theme.badge ? <span style={{ color: active ? "#FFD43B" : "#202020", fontWeight: 600 }}>{theme.badge}</span> : null}
      </span>
      <span className="block h-[3px] overflow-hidden rounded-full" style={{ background: active ? "rgba(255,255,255,.25)" : "#E4E4E4" }}>
        <span className="block h-full rounded-full" style={{ width, background: active || fill === "partial" ? "#FFD43B" : "#2fb083" }} />
      </span>
    </button>
  );
}

function GrapesText({
  table,
  field,
  canEdit,
  onSaved,
}: {
  table: BibleTable;
  field: GrapesField;
  canEdit: boolean;
  onSaved: (value: string) => void;
}) {
  if (!canEdit) {
    return <p className="text-[16px] leading-relaxed" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{table.values[field] || "Пока пусто"}</p>;
  }
  if (table.model === "Story") {
    return (
      <textarea
        key={`${table.recordId}-${field}`}
        defaultValue={table.values[field]}
        aria-label={field}
        className={fieldClass}
        style={{ borderColor: "var(--border)", fontFamily: "var(--font-serif), Georgia, serif", minHeight: 120 }}
        onBlur={(event) => {
          onSaved(event.target.value);
          void updateStoryGrapesField(table.recordId, field, event.target.value);
        }}
      />
    );
  }
  return (
    <SuggestableField
      key={`${table.recordId}-${field}`}
      model={table.model}
      recordId={table.recordId}
      field={field}
      value={table.values[field]}
      suggestion={table.suggestions[field]}
      placeholder="Коротко, своими словами"
      ariaLabel={field}
      className={fieldClass}
      style={{ borderColor: "var(--border)", fontFamily: "var(--font-serif), Georgia, serif", minHeight: 120 }}
      onSaved={onSaved}
    />
  );
}

function StickyTexts({
  scope,
  recordId,
  canEdit,
  fantasyGeneral,
  fantasyNotes,
  suggestions,
}: {
  scope: Scope;
  recordId: string;
  canEdit: boolean;
  fantasyGeneral: string;
  fantasyNotes: string;
  suggestions?: Record<string, string>;
}) {
  const style = { fontFamily: "var(--font-serif), Georgia, serif", minHeight: 72, background: "transparent", border: 0, padding: 0 };
  if (!canEdit) {
    return (
      <>
        <h4 className="text-[13px] font-semibold" style={{ color: "#7a6a1e" }}>Коротко о мире</h4>
        <p className="mt-1 text-[14.5px] leading-relaxed" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{fantasyGeneral || "Пока пусто"}</p>
        <h4 className="mt-3 text-[13px] font-semibold" style={{ color: "#7a6a1e" }}>Заметки</h4>
        <p className="mt-1 text-[14.5px] leading-relaxed" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{fantasyNotes || "Пока пусто"}</p>
      </>
    );
  }
  if (scope === "story") {
    return (
      <>
        <h4 className="text-[13px] font-semibold" style={{ color: "#7a6a1e" }}>Коротко о мире</h4>
        <textarea defaultValue={fantasyGeneral} aria-label="Коротко о мире" className="mt-1 w-full text-[14.5px] leading-relaxed outline-none" style={style} onBlur={(event) => void updateStoryFantasyText(recordId, "fantasyGeneral", event.target.value)} />
        <h4 className="mt-3 text-[13px] font-semibold" style={{ color: "#7a6a1e" }}>Заметки</h4>
        <textarea defaultValue={fantasyNotes} aria-label="Заметки" className="mt-1 w-full text-[14.5px] leading-relaxed outline-none" style={{ ...style, minHeight: 110 }} onBlur={(event) => void updateStoryFantasyText(recordId, "fantasyNotes", event.target.value)} />
      </>
    );
  }
  const model = scope === "cycle" ? "Cycle" : "Book";
  return (
    <>
      <h4 className="text-[13px] font-semibold" style={{ color: "#7a6a1e" }}>Коротко о мире</h4>
      <SuggestableField model={model} recordId={recordId} field="fantasyGeneral" value={fantasyGeneral} suggestion={suggestions?.fantasyGeneral} ariaLabel="Коротко о мире" className="mt-1 w-full text-[14.5px] leading-relaxed outline-none" style={style} />
      <h4 className="mt-3 text-[13px] font-semibold" style={{ color: "#7a6a1e" }}>Заметки</h4>
      <SuggestableField model={model} recordId={recordId} field="fantasyNotes" value={fantasyNotes} suggestion={suggestions?.fantasyNotes} ariaLabel="Заметки" className="mt-1 w-full text-[14.5px] leading-relaxed outline-none" style={{ ...style, minHeight: 110 }} />
    </>
  );
}

function EntryEditor({
  entry,
  canEdit,
  photoKind,
  onSave,
  onDelete,
  onCategory,
  onPhoto,
}: {
  entry: BibleEntry;
  canEdit: boolean;
  photoKind: PhotoKind;
  onSave: (id: string, title: string, body: string) => void;
  onDelete: (id: string) => void;
  onCategory: (id: string, category: WorldCategory) => void;
  onPhoto: (photoUrl: string | null) => void;
}) {
  const [title, setTitle] = useState(entry.title);
  const [body, setBody] = useState(entry.body);
  const [, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <div className="mt-1 rounded-[16px] p-3" style={{ border: "1px solid #E8E1DC" }}>
        <div className="text-[16px] font-semibold">{entry.title || "Без названия"}</div>
        {entry.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.photoUrl} alt="" className="mt-2 h-[120px] w-full rounded-[12px] object-cover" />
        ) : null}
        {entry.body ? <p className="mt-2 text-[15px] leading-relaxed" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{entry.body}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-1 rounded-[16px] p-3" style={{ border: "1px solid #E8E1DC" }}>
      <div className="text-[12px]" style={{ color: "var(--muted)" }}>Запись</div>
      <input
        value={title}
        aria-label="Название"
        onChange={(event) => setTitle(event.target.value)}
        className="mt-1 w-full rounded-[12px] border px-2.5 py-2 text-[16px] font-semibold outline-none"
        style={{ borderColor: "var(--border)" }}
      />
      <ImageUploadBox
        value={entry.photoUrl}
        placeholder="добавить фото"
        className="mt-2 h-[120px] w-full rounded-[12px]"
        onUpload={(file) => {
          onPhoto(URL.createObjectURL(file));
          startTransition(() => { void uploadFile(photoKind, entry.id, "photoUrl", file); });
        }}
        onDelete={() => {
          onPhoto(null);
          startTransition(() => { void deletePhoto(photoKind, entry.id, "photoUrl"); });
        }}
      />
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={`theme-${entry.id}`} className="text-[12px]" style={{ color: "var(--muted)" }}>Тема</label>
        <select
          id={`theme-${entry.id}`}
          value={entry.category}
          className="h-8 rounded-[12px] border bg-white px-2 text-[13px]"
          style={{ borderColor: "var(--border)" }}
          onChange={(event) => {
            if (isEntryCategory(event.target.value)) onCategory(entry.id, event.target.value);
          }}
        >
          {BIBLE_THEMES.filter((theme) => theme.category).map((theme) => (
            <option key={theme.id} value={theme.category}>{theme.label}</option>
          ))}
        </select>
      </div>
      <textarea
        value={body}
        aria-label="Текст записи"
        onChange={(event) => setBody(event.target.value)}
        className={`${fieldClass} mt-2`}
        style={{ borderColor: "var(--border)", fontFamily: "var(--font-serif), Georgia, serif", minHeight: 110 }}
      />
      <div className="mt-2.5 flex items-center gap-3">
        <Button type="button" variant="primary" size="sm" pill onClick={() => onSave(entry.id, title, body)}>Сохранить</Button>
        <button type="button" onClick={() => onDelete(entry.id)} className="rounded-full px-3 py-1.5 text-[12.5px]" style={{ border: "1px dashed var(--border)", color: "var(--link)" }}>удалить запись</button>
      </div>
      <p className="mt-2 text-[12px]" style={{ color: "var(--muted)" }}>Тема записи: {entryLabel(entry.category)}</p>
    </div>
  );
}

function emptyGrapes(): GrapesBag {
  return {
    grapesGeography: "",
    grapesReligion: "",
    grapesAchievements: "",
    grapesPolitics: "",
    grapesEconomy: "",
    grapesSocial: "",
  };
}

function pickGrapes(source: GrapesBag): GrapesBag {
  const bag = emptyGrapes();
  for (const field of GRAPES_FIELDS) bag[field] = source[field] ?? "";
  return bag;
}
