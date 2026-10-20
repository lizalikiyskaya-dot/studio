"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode } from "react";
import type { WorldCategory } from "@/generated/prisma/client";
import { siteConfirm } from "@/components/SiteDialog";
import ImageUploadBox from "@/components/ImageUploadBox";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { Button } from "@/components/ui/Button";
import InlineTitle from "@/components/InlineTitle";
import ReadingText from "@/components/ReadingText";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import {
  BIBLE_THEMES,
  GRAPES_FIELDS,
  appendCheckLine,
  entryLabel,
  entryOnSetting,
  isEntryCategory,
  nextThemeCue,
  storedSettingKey,
  themeFill,
  themeNoteKey,
  toggleCheckLine,
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
  loadThemeNotes,
  saveThemeNote,
  updateFantasyText,
  updateWorldEntryBody,
  updateWorldEntryCategory,
  updateWorldEntryTitle,
} from "./actions";
import {
  createCycleWorldEntry,
  createStoryWorldEntry,
  deleteCycleWorldEntry,
  deleteStoryWorldEntry,
  updateCycleFantasyText,
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
  settingKey?: string | null;
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
  photoKind: PhotoKind;
}) {
  const [tables, setTables] = useState(initialTables);
  const [tableId, setTableId] = useState(initialTables[0]?.id ?? "primary");
  const [entries, setEntries] = useState(initialEntries);
  const [openTheme, setOpenTheme] = useState<BibleTheme | null>(null);
  const [notes, setNotes] = useState(fantasyNotes);
  const [themeNotes, setThemeNotes] = useState<Record<string, string>>({});
  const [mobileNotes, setMobileNotes] = useState(false);
  const [wide, setWide] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const nudged = useRef(false);

  const table = tables.find((item) => item.id === tableId) ?? tables[0];
  const grapes = table?.values ?? emptyGrapes();
  const visibleEntries = allowTables
    ? entries.filter((entry) => entryOnSetting(entry.settingKey, table?.id ?? "primary"))
    : entries;
  const cue = nextThemeCue(grapes, visibleEntries, true);
  const themeEntries = openTheme?.category ? visibleEntries.filter((entry) => entry.category === openTheme.category) : [];
  const selected = themeEntries.find((entry) => entry.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (document.querySelector(".site-dialog-root, .site-choice-root")) return;
      setSelectedId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  useEffect(() => {
    let cancel = false;
    void loadThemeNotes(scope, recordId).then((rows) => {
      if (!cancel) setThemeNotes(rows);
    });
    return () => {
      cancel = true;
    };
  }, [scope, recordId]);

  useLayoutEffect(() => {
    const query = window.matchMedia("(min-width: 981px)");
    const apply = () => setWide(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!nudged.current) {
      nudged.current = true;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    setNudge(true);
  }, [openTheme?.id]);

  function openChip(theme: BibleTheme) {
    setOpenTheme((current) => (current?.id === theme.id ? null : theme));
    setSelectedId(null);
    setMobileNotes(true);
  }

  function saveOpenThemeNote(value: string) {
    if (!openTheme || !table || !canEdit) return;
    const settingKey = openTheme.kind === "grapes" ? table.id : "";
    const key = themeNoteKey(settingKey, openTheme.id);
    setThemeNotes((prev) => ({ ...prev, [key]: value }));
    const themeId = openTheme.id;
    startTransition(() => {
      void saveThemeNote(scope, recordId, settingKey, themeId, value);
    });
  }

  function saveNotes(value: string) {
    setNotes(value);
    startTransition(() => {
      if (scope === "story") void updateStoryFantasyText(recordId, "fantasyNotes", value);
      else if (scope === "cycle") void updateCycleFantasyText(recordId, "fantasyNotes", value);
      else void updateFantasyText(recordId, "fantasyNotes", value);
    });
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

  function handleAddEntry() {
    if (!canEdit || !openTheme?.category) return;
    const category = openTheme.category;
    startTransition(async () => {
      const created = scope === "cycle"
        ? await createCycleWorldEntry(recordId, category)
        : scope === "story"
          ? await createStoryWorldEntry(recordId, category)
          : await createWorldEntry(recordId, category, storedSettingKey(table?.id ?? "primary"));
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

  function selectEntry(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  function collapseEntry() {
    setSelectedId(null);
  }

  function handleTitle(id: string, title: string) {
    if (!canEdit) return;
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, title } : entry)));
    startTransition(() => {
      if (scope === "cycle") void updateCycleWorldEntryTitle(id, title);
      else if (scope === "story") void updateStoryWorldEntryTitle(id, title);
      else void updateWorldEntryTitle(id, title);
    });
  }

  function saveBody(id: string, body: string) {
    if (!canEdit) return;
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, body } : entry)));
    startTransition(() => {
      if (scope === "cycle") void updateCycleWorldEntryBody(id, body);
      else if (scope === "story") void updateStoryWorldEntryBody(id, body);
      else void updateWorldEntryBody(id, body);
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
  for (const entry of visibleEntries) {
    const list = bodies.get(entry.category) ?? [];
    list.push(entry.body);
    bodies.set(entry.category, list);
  }

  const grapesThemes = BIBLE_THEMES.filter((theme) => theme.kind === "grapes");
  const entryThemes = BIBLE_THEMES.filter((theme) => theme.kind === "entry");
  const sticker = (
    <WorldSticker
      scope={scope}
      recordId={recordId}
      canEdit={canEdit}
      fantasyGeneral={fantasyGeneral}
      notes={notes}
      onNotes={saveNotes}
      suggestions={fantasySuggestions}
      themeLabel={openTheme?.label ?? null}
      themeNote={openTheme && table ? themeNotes[themeNoteKey(openTheme.kind === "grapes" ? table.id : "", openTheme.id)] ?? "" : ""}
      themeKey={openTheme && table ? `${openTheme.kind === "grapes" ? table.id : ""}:${openTheme.id}` : "closed"}
      onThemeNote={saveOpenThemeNote}
      nudged={nudge}
      onNudgeEnd={() => setNudge(false)}
    />
  );

  return (
    <section className="rounded-[24px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <h2 className="text-[17px] font-semibold">Библия мира</h2>

      {cue ? (
        <p className="mt-2.5 text-[13px]" style={{ color: "var(--ink2)" }}>
          <span className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full align-middle" style={{ background: "#FFD43B" }} />
          Дальше: {cue}
        </p>
      ) : null}

      <div className="bible-layout">
        <div className="bible-main">
          {allowTables && table ? (
            <label className="bible-setting-pick">
              <span>Сеттинг</span>
              <select
                aria-label="Сеттинг"
                value={table.id}
                onChange={(event) => {
                  setTableId(event.target.value);
                  setSelectedId(null);
                }}
              >
                {tables.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="bible-groups">
            <section className="bible-group">
              <h3 className="bible-group-title mb-2.5">Метод GRAPES</h3>
              {allowTables && canEdit ? (
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
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
              <ChipGrid
                themes={grapesThemes}
                openTheme={openTheme?.kind === "grapes" ? openTheme : null}
                grapes={grapes}
                bodies={bodies}
                onOpen={openChip}
                panel={openTheme?.kind === "grapes" && table ? (
                  <ThemePanel
                    theme={openTheme}
                    table={table}
                    canEdit={canEdit}
                    entries={themeEntries}
                    selected={selected}
                    photoKind={photoKind}
                    onClose={() => setOpenTheme(null)}
                    onPatchGrapes={patchGrapes}
                    onSelect={selectEntry}
                    onAdd={handleAddEntry}
                    onSaveBody={saveBody}
                    onCollapse={collapseEntry}
                    onTitle={handleTitle}
                    onDelete={handleDeleteEntry}
                    onCategory={handleCategory}
                    onPhoto={(photoUrl) => setEntries((prev) => prev.map((entry) => entry.id === selected?.id ? { ...entry, photoUrl } : entry))}
                  />
                ) : null}
              />
              {!wide && openTheme?.kind === "grapes" ? <div className="bible-sticker-mobile">{sticker}</div> : null}
            </section>

            <section className="bible-group">
              <h3 className="bible-group-title mb-2.5">Записи</h3>
              <ChipGrid
                themes={entryThemes}
                openTheme={openTheme?.kind === "entry" ? openTheme : null}
                grapes={grapes}
                bodies={bodies}
                onOpen={openChip}
                panel={openTheme?.kind === "entry" && table ? (
                  <ThemePanel
                    theme={openTheme}
                    table={table}
                    canEdit={canEdit}
                    entries={themeEntries}
                    selected={selected}
                    photoKind={photoKind}
                    onClose={() => setOpenTheme(null)}
                    onPatchGrapes={patchGrapes}
                    onSelect={selectEntry}
                    onAdd={handleAddEntry}
                    onSaveBody={saveBody}
                    onCollapse={collapseEntry}
                    onTitle={handleTitle}
                    onDelete={handleDeleteEntry}
                    onCategory={handleCategory}
                    onPhoto={(photoUrl) => setEntries((prev) => prev.map((entry) => entry.id === selected?.id ? { ...entry, photoUrl } : entry))}
                  />
                ) : null}
              />
              {!wide && openTheme?.kind === "entry" ? <div className="bible-sticker-mobile">{sticker}</div> : null}
            </section>
          </div>

          {!wide && !openTheme ? (
            <div className="bible-sticker-mobile">
              {mobileNotes ? sticker : (
                <button type="button" onClick={() => setMobileNotes(true)} className="text-[13px]" style={{ color: "var(--ink2)" }}>Заметки</button>
              )}
            </div>
          ) : null}
        </div>
        <aside className="bible-sticker-side" aria-label="Заметки">
          {wide ? sticker : null}
        </aside>
      </div>
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
      aria-expanded={active}
      className="flex flex-col gap-1.5 rounded-[14px] px-2.5 py-2 text-left"
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
    return table.values[field] ? <ReadingText text={table.values[field]} /> : <p className="text-[16px]" style={{ color: "var(--muted)" }}>Пока пусто</p>;
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

function ChipGrid({
  themes,
  openTheme,
  grapes,
  bodies,
  onOpen,
  panel,
}: {
  themes: BibleTheme[];
  openTheme: BibleTheme | null;
  grapes: GrapesBag;
  bodies: Map<WorldCategory, string[]>;
  onOpen: (theme: BibleTheme) => void;
  panel: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const chips = [...el.querySelectorAll<HTMLElement>(":scope > .bible-chip")];
      if (!chips.length) return;
      const top = chips[0].offsetTop;
      let count = 0;
      for (const chip of chips) {
        if (chip.offsetTop - top > 2) break;
        count += 1;
      }
      if (count > 0) setCols(count);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [themes.length, openTheme?.id]);
  const openIndex = openTheme ? themes.findIndex((theme) => theme.id === openTheme.id) : -1;
  const rowEnd = openIndex < 0 ? -1 : Math.min(themes.length - 1, Math.floor(openIndex / cols) * cols + cols - 1);

  return (
    <div ref={ref} className="bible-chips mt-1.5">
      {themes.map((theme, index) => (
        <Fragment key={theme.id}>
          <div className="bible-chip">
            <ThemeChip
              theme={theme}
              fill={themeFill(theme, grapes, bodies)}
              active={openTheme?.id === theme.id}
              onClick={() => onOpen(theme)}
            />
          </div>
          {index === rowEnd ? <ExpandSlot>{panel}</ExpandSlot> : null}
        </Fragment>
      ))}
    </div>
  );
}

function ExpandSlot({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className={`bible-expand${shown ? " is-open" : ""}`}>
      <div className="bible-expand-inner">{children}</div>
    </div>
  );
}

function ThemePanel({
  theme,
  table,
  canEdit,
  entries,
  selected,
  photoKind,
  onClose,
  onPatchGrapes,
  onSelect,
  onAdd,
  onSaveBody,
  onCollapse,
  onTitle,
  onDelete,
  onCategory,
  onPhoto,
}: {
  theme: BibleTheme;
  table: BibleTable;
  canEdit: boolean;
  entries: BibleEntry[];
  selected: BibleEntry | null;
  photoKind: PhotoKind;
  onClose: () => void;
  onPatchGrapes: (field: GrapesField, value: string) => void;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onSaveBody: (id: string, body: string) => void;
  onCollapse: () => void;
  onTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onCategory: (id: string, category: WorldCategory) => void;
  onPhoto: (photoUrl: string | null) => void;
}) {
  return (
    <div
      className="bible-panel"
      onClick={theme.kind === "entry" ? (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest("[data-entry-editor], [data-entry-row], button, a, input, textarea, select, label")) return;
        onCollapse();
      } : undefined}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-[18px] font-semibold leading-tight">
          {theme.badge ? <span className="mr-2 text-[13px]" style={{ color: "var(--muted)" }}>{theme.badge}</span> : null}
          {theme.label}
        </h3>
        <button type="button" onClick={onClose} className="ml-auto text-[13px]" style={{ color: "var(--ink2)" }}>свернуть</button>
      </div>
      <div className="mt-3 rounded-[16px] px-3.5 py-3" style={{ background: "#F8F4F1" }}>
        <div className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>Подсказки</div>
        <ul className="mt-1.5 flex flex-col gap-1">
          {theme.hints.map((hint) => (
            <li key={hint} className="text-[13px] leading-snug" style={{ color: "var(--ink2)" }}>{hint}</li>
          ))}
        </ul>
      </div>
      {theme.kind === "grapes" && theme.field ? (
        <div className="mt-4">
          <GrapesText table={table} field={theme.field} canEdit={canEdit} onSaved={(value) => onPatchGrapes(theme.field!, value)} />
          <p className="mt-2 text-[12.5px]" style={{ color: "var(--muted)" }}>У этого текста нет фото. Фото добавляется в записи.</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {entries.map((entry) => {
            const editingTitle = canEdit && selected?.id === entry.id;
            return (
            <div
              key={entry.id}
              data-entry-row
              className="flex items-center gap-3 rounded-[16px] p-2.5 text-left"
              style={{ background: editingTitle ? "#E8E1DC" : "var(--soft)" }}
            >
              <button type="button" onClick={() => onSelect(entry.id)} className="shrink-0" aria-label={entry.title || "Запись"}>
                {entry.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.photoUrl} alt="" className="h-12 w-14 rounded-[10px] object-cover" />
                ) : (
                  <span className="grid h-12 w-14 place-items-center rounded-[10px] text-[11px]" style={{ background: "#F8F4F1", color: "var(--muted)" }}>фото</span>
                )}
              </button>
              <span className="min-w-0 flex-1">
                {editingTitle ? (
                  <InlineTitle
                    value={entry.title}
                    autoFocus={!entry.title.trim()}
                    placeholder="Название"
                    onSave={(title) => onTitle(entry.id, title)}
                    className="text-[14px]"
                  />
                ) : (
                  <button type="button" onClick={() => onSelect(entry.id)} className="block w-full text-left text-[14px] font-semibold">
                    {entry.title || "Без названия"}
                  </button>
                )}
                <button type="button" onClick={() => onSelect(entry.id)} className="mt-0.5 block w-full truncate text-left text-[12.5px]" style={{ color: "var(--ink2)" }}>
                  {entry.body || "текст не начат"}
                </button>
              </span>
            </div>
            );
          })}
          {canEdit ? (
            <button type="button" onClick={onAdd} className="self-start text-[13px]" style={{ color: "var(--muted)" }}>+ запись</button>
          ) : null}
          {entries.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--muted)" }}>Пока нет записей.</p>
          ) : null}
          {selected ? (
            <EntryEditor
              key={selected.id}
              entry={selected}
              canEdit={canEdit}
              photoKind={photoKind}
              onSaveBody={onSaveBody}
              onCollapse={onCollapse}
              onDelete={onDelete}
              onCategory={onCategory}
              onPhoto={onPhoto}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function WorldSticker({
  scope,
  recordId,
  canEdit,
  fantasyGeneral,
  notes,
  onNotes,
  suggestions,
  themeLabel,
  themeNote,
  themeKey,
  onThemeNote,
  nudged,
  onNudgeEnd,
}: {
  scope: Scope;
  recordId: string;
  canEdit: boolean;
  fantasyGeneral: string;
  notes: string;
  onNotes: (value: string) => void;
  suggestions?: Record<string, string>;
  themeLabel: string | null;
  themeNote: string;
  themeKey: string;
  onThemeNote: (value: string) => void;
  nudged: boolean;
  onNudgeEnd: () => void;
}) {
  const ink = { color: "#5c5016" };
  const style = { fontFamily: "var(--font-serif), Georgia, serif", minHeight: 56, background: "transparent", border: 0, padding: 0, color: "#3a3416" };
  const model = scope === "cycle" ? "Cycle" : "Book";
  const pendingNotes = scope !== "story" && suggestions?.fantasyNotes;
  return (
    <div className={`bible-sticker${nudged ? " is-nudged" : ""}`} onAnimationEnd={onNudgeEnd}>
      <h4 className="text-[13px] font-semibold" style={ink}>Коротко о мире</h4>
      {!canEdit ? (
        <p className="mt-1 text-[14px] leading-relaxed" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{fantasyGeneral || "Пока пусто"}</p>
      ) : scope === "story" ? (
        <textarea defaultValue={fantasyGeneral} aria-label="Коротко о мире" className="mt-1 w-full text-[14px] leading-relaxed outline-none" style={style} onBlur={(event) => void updateStoryFantasyText(recordId, "fantasyGeneral", event.target.value)} />
      ) : (
        <SuggestableField model={model} recordId={recordId} field="fantasyGeneral" value={fantasyGeneral} suggestion={suggestions?.fantasyGeneral} ariaLabel="Коротко о мире" className="mt-1 w-full text-[14px] leading-relaxed outline-none" style={style} />
      )}
      <h4 className="mt-3 text-[13px] font-semibold" style={ink}>Заметки</h4>
      {pendingNotes ? (
        <SuggestableField model={model} recordId={recordId} field="fantasyNotes" value={notes} suggestion={suggestions?.fantasyNotes} ariaLabel="Заметки" className="mt-1 w-full text-[14px] leading-relaxed outline-none" style={{ ...style, minHeight: 72 }} />
      ) : (
        <NoteChecklist value={notes} canEdit={canEdit} onSave={onNotes} />
      )}
      <div className="mt-3 border-t pt-3" style={{ borderColor: "rgba(92,80,22,0.18)" }}>
        <h4 className="text-[13px] font-semibold" style={ink}>К этой теме</h4>
        {themeLabel ? (
          canEdit ? (
            <textarea
              key={themeKey}
              defaultValue={themeNote}
              aria-label={`Заметка темы ${themeLabel}`}
              placeholder="Заметка только к этой теме"
              className="mt-1 w-full text-[14px] leading-relaxed outline-none"
              style={{ ...style, minHeight: 72 }}
              onBlur={(event) => onThemeNote(event.target.value)}
            />
          ) : (
            <p className="mt-1 text-[14px] leading-relaxed" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{themeNote || "Пока пусто"}</p>
          )
        ) : (
          <p className="mt-1 text-[12.5px] leading-snug" style={ink}>Откройте тему.</p>
        )}
      </div>
    </div>
  );
}

function NoteChecklist({ value, canEdit, onSave }: { value: string; canEdit: boolean; onSave: (value: string) => void }) {
  const [text, setText] = useState(value);
  const textRef = useRef(text);
  const lines = text.length ? text.split("\n") : [];
  function replaceLine(index: number, line: string, save: boolean) {
    const next = textRef.current.split("\n");
    next[index] = line;
    const joined = next.join("\n");
    textRef.current = joined;
    setText(joined);
    if (save) onSave(joined);
  }
  return (
    <div className="mt-1 flex flex-col gap-1">
      {lines.length === 0 ? <p className="text-[13px]" style={{ color: "#8a7a32" }}>Пока пусто</p> : null}
      {lines.map((line, index) => {
        const match = line.match(/^(\s*)- \[([ xX])\](.*)$/);
        if (match) {
          const checked = match[2].toLowerCase() === "x";
          return (
            <label key={index} className="flex items-start gap-2 text-[14px] leading-snug" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                disabled={!canEdit}
                aria-label={match[3].trim() || "пункт"}
                onChange={() => {
                  const next = toggleCheckLine(textRef.current, index);
                  textRef.current = next;
                  setText(next);
                  onSave(next);
                }}
              />
              {canEdit ? (
                <input
                  value={match[3].replace(/^ /, "")}
                  aria-label="Текст пункта"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  onChange={(event) => replaceLine(index, `${match[1]}- [${match[2]}] ${event.target.value}`, false)}
                  onBlur={() => onSave(textRef.current)}
                />
              ) : (
                <span>{match[3].trim() || "пункт"}</span>
              )}
            </label>
          );
        }
        return canEdit ? (
          <input
            key={index}
            value={line}
            aria-label="Строка заметки"
            className="w-full bg-transparent text-[14px] outline-none"
            style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            onChange={(event) => replaceLine(index, event.target.value, false)}
            onBlur={() => onSave(textRef.current)}
          />
        ) : (
          <p key={index} className="text-[14px] leading-snug" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>{line}</p>
        );
      })}
      {canEdit ? (
        <button
          type="button"
          onClick={() => {
            const next = appendCheckLine(textRef.current);
            textRef.current = next;
            setText(next);
            onSave(next);
          }}
          className="self-start text-[12.5px]"
          style={{ color: "#5c5016" }}
        >
          + пункт
        </button>
      ) : null}
    </div>
  );
}

function EntryEditor({
  entry,
  canEdit,
  photoKind,
  onSaveBody,
  onCollapse,
  onDelete,
  onCategory,
  onPhoto,
}: {
  entry: BibleEntry;
  canEdit: boolean;
  photoKind: PhotoKind;
  onSaveBody: (id: string, body: string) => void;
  onCollapse: () => void;
  onDelete: (id: string) => void;
  onCategory: (id: string, category: WorldCategory) => void;
  onPhoto: (photoUrl: string | null) => void;
}) {
  const [body, setBody] = useState(entry.body);
  const bodyRef = useRef(entry.body);
  const savedRef = useRef(entry.body);
  const saveRef = useRef(onSaveBody);
  const [, startTransition] = useTransition();
  bodyRef.current = body;
  saveRef.current = onSaveBody;

  function persist() {
    if (!canEdit) return;
    if (bodyRef.current === savedRef.current) return;
    const next = bodyRef.current;
    savedRef.current = next;
    saveRef.current(entry.id, next);
  }

  useEffect(() => {
    const id = entry.id;
    return () => {
      if (bodyRef.current === savedRef.current) return;
      const next = bodyRef.current;
      savedRef.current = next;
      saveRef.current(id, next);
    };
  }, [entry.id]);

  if (!canEdit) {
    return (
      <div data-entry-editor className="mt-1 rounded-[16px] p-3" style={{ border: "1px solid #E8E1DC" }}>
        <div className="flex items-center gap-2">
          <div className="text-[16px] font-semibold">{entry.title || "Без названия"}</div>
          <button type="button" onClick={onCollapse} className="ml-auto text-[12.5px]" style={{ color: "var(--ink2)" }}>свернуть запись</button>
        </div>
        {entry.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.photoUrl} alt="" className="mt-2 h-[120px] w-full rounded-[12px] object-cover" />
        ) : null}
        {entry.body ? <ReadingText text={entry.body} className="mt-2" /> : null}
      </div>
    );
  }

  return (
    <div data-entry-editor className="mt-1 rounded-[16px] p-3" style={{ border: "1px solid #E8E1DC" }}>
      <div className="flex items-center">
        <button type="button" onClick={onCollapse} className="ml-auto text-[12.5px]" style={{ color: "var(--ink2)" }}>свернуть запись</button>
      </div>
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
        onChange={(event) => {
          bodyRef.current = event.target.value;
          setBody(event.target.value);
        }}
        onBlur={persist}
        className={`${fieldClass} mt-2`}
        style={{ borderColor: "var(--border)", fontFamily: "var(--font-serif), Georgia, serif", minHeight: 110 }}
      />
      <div className="mt-2.5 flex items-center gap-3">
        <Button type="button" variant="primary" size="sm" pill onClick={persist}>Сохранить</Button>
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
