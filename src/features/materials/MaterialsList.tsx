"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import type { MaterialCategory, MaterialStatus } from "@/generated/prisma/client";
import { materialToRow, type MaterialRow } from "./materialFile";
import Accordion from "@/components/Accordion";
import Collapse from "@/components/Collapse";
import InlineTitle from "@/components/InlineTitle";
import FileAttachBox from "@/components/FileAttachBox";
import { uploadFile } from "@/lib/uploadFile";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { ChevronDown, GripVertical } from "lucide-react";
import {
  createMaterial,
  updateMaterialTitle,
  cycleMaterialStatus,
  deleteMaterial,
  reorderMaterials,
  setMaterialOptional,
  setMaterialMonth,
  setMaterialNote,
} from "./actions";
import { appendMaterial, applyMaterialTitles, enqueueById, enqueueCreate, toggleOpenId } from "./materialRows";
import { BOOK_NOTE_MAX, storedBookNote, visibleBookMonth, visibleBookNote } from "./materialFile";
import { BOOK_MONTHS, bookMonthYears, formatStoredBookMonth, parseStoredBookMonth } from "./bookMonthSelect";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_STYLE, nextMaterialStatus } from "./status";
import { Button } from "@/components/ui/Button";
import EmptyState from "@/components/EmptyState";
import DownloadButton from "@/components/DownloadButton";
import { dataUrlBytes } from "@/lib/fileMeta";
import LibraryGuides from "./LibraryGuides";
import type { CabinetGuide } from "@/features/guides/types";

function useDrag<T extends { id: string }>(
  items: T[],
  setItems: React.Dispatch<React.SetStateAction<T[]>>,
  onReorder: (ids: string[]) => void
) {
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  function onDragStart(id: string) {
    dragId.current = id;
  }

  function onDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    dragOverId.current = id;
  }

  function onDrop() {
    const from = dragId.current;
    const to = dragOverId.current;
    if (!from || !to || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((i) => i.id === from);
      const toIdx = next.findIndex((i) => i.id === to);
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      onReorder(next.map((i) => i.id));
      return next;
    });
    dragId.current = null;
    dragOverId.current = null;
  }

  return { onDragStart, onDragOver, onDrop };
}

function BookMonthField({ month }: { month: string | null }) {
  const shown = visibleBookMonth(month);
  // Пустой месяц не рисуем никому: плашка «месяц» в шапке была пустым местом.
  if (!shown) return null;

  return (
    <span
      data-book-month={shown}
      className="mt-1 inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[12px] font-medium leading-none"
      style={{ background: "var(--note)", color: "var(--noteink)", border: "1px solid transparent" }}
    >
      {shown}
    </span>
  );
}

function BookNoteLine({ note }: { note: string | null }) {
  const shown = visibleBookNote(note);
  if (!shown) return null;
  return (
    <span
      data-book-note={shown}
      className="mt-1 block whitespace-normal break-words text-[13px] font-normal leading-snug"
      style={{ color: "var(--ink2)", letterSpacing: "normal", fontWeight: 400 }}
    >
      {shown}
    </span>
  );
}

function BookMonthInput({
  month,
  onCommit,
}: {
  month: string | null;
  onCommit: (value: string) => void;
}) {
  const parsed = parseStoredBookMonth(month);
  const stored = (month ?? "").trim();
  const [monthId, setMonthId] = useState(parsed ? String(parsed.month) : "");
  const [year, setYear] = useState(parsed ? String(parsed.year) : "");
  const years = bookMonthYears(new Date(), parsed?.year);

  function apply(nextMonth: string, nextYear: string) {
    setMonthId(nextMonth);
    setYear(nextYear);
    if (!nextMonth && !nextYear) {
      if (stored) onCommit("");
      return;
    }
    if (!nextMonth || !nextYear) return;
    const formatted = formatStoredBookMonth(Number(nextMonth), Number(nextYear));
    if (formatted && formatted !== stored) onCommit(formatted);
  }

  return (
    <div className="fld-wrap">
      {!parsed && stored ? (
        <p className="mb-1.5 text-[13px] leading-snug" style={{ color: "var(--ink2)" }}>
          {stored}
        </p>
      ) : null}
      <div className="flex gap-2">
        <select
          aria-label="месяц"
          value={monthId}
          onChange={(event) => apply(event.target.value, year)}
          className="fld min-w-0"
          style={{ flex: "1 1 auto", width: "auto" }}
        >
          <option value="">не указан</option>
          {BOOK_MONTHS.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <select
          aria-label="год"
          value={year}
          onChange={(event) => apply(monthId, event.target.value)}
          className="fld"
          style={{ flex: "0 0 120px", width: 120 }}
        >
          <option value="">не указан</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function BookNoteInput({
  note,
  onCommit,
}: {
  note: string | null;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(note ?? "");
  return (
    <input
      value={value}
      maxLength={BOOK_NOTE_MAX}
      placeholder="коротко, если книга не целиком"
      aria-label="заметка к книге"
      autoComplete="off"
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => {
        if (value.trim() !== (note ?? "").trim()) onCommit(value);
      }}
      onKeyDown={blurOnEnter}
      className="fld"
    />
  );
}

function useEditableMaterials(initial: MaterialRow[]) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();
  const titleSaves = useRef(new Map<string, Promise<void>>());
  const addChain = useRef<Promise<void>>(Promise.resolve());

  function saveTitle(id: string, value: string) {
    setItems((prev) => applyMaterialTitles(prev, [{ id, title: value }]));
    // Not the same transition as create/upload: those used to interrupt this
    // save, and the next row's title landed on the previous id.
    enqueueById(titleSaves.current, id, () => updateMaterialTitle(id, value));
  }

  function addItem(studentId: string, category: MaterialCategory, onCreated?: (row: MaterialRow) => void) {
    addChain.current = enqueueCreate(
      addChain.current,
      () => createMaterial(studentId, category, crypto.randomUUID()),
      (material) => {
        const row = materialToRow(material);
        setItems((prev) => appendMaterial(prev, row));
        onCreated?.(row);
      },
    );
  }

  return { items, setItems, startTransition, saveTitle, addItem };
}

function BooksList({
  studentId,
  materials,
  canManage,
}: {
  studentId: string;
  materials: MaterialRow[];
  canManage: boolean;
}) {
  const { items: books, setItems: setBooks, startTransition, saveTitle, addItem } = useEditableMaterials(materials);
  // Card is draggable ONLY while its grip handle is held — otherwise the
  // whole card grabs mousedown and hijacks text selection / cut.
  const [armedId, setArmedId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);

  const drag = useDrag(books, setBooks, (ids) =>
    startTransition(() => reorderMaterials(studentId, ids))
  );

  function handleAdd() {
    addItem(studentId, "BOOK", (row) => setFreshId(row.id));
  }

  function handleFile(id: string, field: "pdf" | "epub", file: File) {
    startTransition(async () => {
      const { fileName, dataUrl } = await uploadFile("material", id, field, file);
      setBooks((prev) =>
        prev.map((m) =>
          m.id === id
            ? field === "pdf"
              ? { ...m, pdfHref: dataUrl, pdfName: fileName, pdfBytes: dataUrlBytes(dataUrl) }
              : { ...m, epubHref: dataUrl, epubName: fileName, epubBytes: dataUrlBytes(dataUrl) }
            : m
        )
      );
    });
  }

  function handleStatus(id: string, current: MaterialStatus) {
    const next = nextMaterialStatus(current);
    setBooks((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
    startTransition(async () => { await cycleMaterialStatus(id); });
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить книгу?"))) return;
    setBooks((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => deleteMaterial(id));
  }

  function handleOptional(id: string, optional: boolean) {
    setBooks((prev) => prev.map((m) => (m.id === id ? { ...m, optional } : m)));
    startTransition(() => setMaterialOptional(id, optional));
  }

  function handleMonth(id: string, month: string) {
    const trimmed = month.trim().slice(0, 80);
    const next = trimmed.length ? trimmed : null;
    setBooks((prev) => prev.map((m) => (m.id === id ? { ...m, month: next } : m)));
    startTransition(() => setMaterialMonth(id, trimmed));
  }

  function handleNote(id: string, note: string) {
    const next = storedBookNote(note);
    setBooks((prev) => prev.map((m) => (m.id === id ? { ...m, note: next } : m)));
    startTransition(() => setMaterialNote(id, next ?? ""));
  }

  return (
    <div>
      {books.map((material) => (
        <div
          key={material.id}
          draggable={canManage && armedId === material.id}
          onDragStart={() => drag.onDragStart(material.id)}
          onDragOver={(e) => drag.onDragOver(e, material.id)}
          onDrop={drag.onDrop}
          onDragEnd={() => setArmedId(null)}
          onMouseUp={() => setArmedId(null)}
          className="group"
        >
          <Accordion
            key={material.id}
            wrapHeader
            defaultOpen={material.id === freshId}
            title={
              <span className="block min-w-0">
                {canManage ? (
                  <InlineTitle
                    value={material.title}
                    autoFocus={material.id === freshId}
                    placeholder="Название книги"
                    onSave={(value) => saveTitle(material.id, value)}
                    className="text-[15px]"
                  />
                ) : (
                  <span className="block truncate">{material.title || "Без названия"}</span>
                )}
                <BookMonthField month={material.month} />
                <BookNoteLine note={material.note} />
              </span>
            }
            headerPrefix={
              canManage ? (
                <GripVertical
                  size={14}
                  onMouseDown={() => setArmedId(material.id)}
                  className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--ink-faint)" }}
                />
              ) : undefined
            }
            headerExtra={
              <>
                {canManage ? (
                  <label
                    className="inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap"
                    style={{ color: "var(--muted)", fontWeight: 500 }}
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={material.optional}
                      onChange={(event) => handleOptional(material.id, event.target.checked)}
                      aria-label="по желанию"
                      style={{ width: 14, height: 14, accentColor: "var(--ink)" }}
                    />
                    по желанию
                  </label>
                ) : material.optional ? (
                  <span className="text-[12px] whitespace-nowrap" style={{ color: "var(--muted)", fontWeight: 500 }}>
                    по желанию
                  </span>
                ) : null}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatus(material.id, material.status);
                  }}
                  className="text-[12px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
                  style={MATERIAL_STATUS_STYLE[material.status]}
                >
                  {MATERIAL_STATUS_LABEL[material.status]}
                </span>
              </>
            }
          >
            {canManage && (
              <>
                <label className="fld-label" style={{ marginTop: 0 }}>
                  месяц
                  <BookMonthInput
                    key={`${material.id}:month:${material.month ?? ""}`}
                    month={material.month}
                    onCommit={(value) => handleMonth(material.id, value)}
                  />
                </label>
                <label className="fld-label">
                  заметка
                  <BookNoteInput
                    key={`${material.id}:note:${material.note ?? ""}`}
                    note={material.note}
                    onCommit={(value) => handleNote(material.id, value)}
                  />
                </label>
              </>
            )}
            <div className={`flex items-center gap-2 flex-wrap${canManage ? " mt-4" : ""}`}>
              {material.pdfHref ? (
                <DownloadButton href={material.pdfHref} fileName={material.pdfName} mime="application/pdf" bytes={material.pdfBytes} />
              ) : canManage ? (
                <FileAttachBox label="+ файл PDF" onUpload={(file) => handleFile(material.id, "pdf", file)} />
              ) : (
                <span className="text-[13px]" style={{ color: "var(--ink-faint)" }}>PDF пока не загружен</span>
              )}
              {material.epubHref ? (
                <DownloadButton href={material.epubHref} fileName={material.epubName} mime="application/epub+zip" bytes={material.epubBytes} />
              ) : canManage ? (
                <FileAttachBox label="+ файл EPUB" onUpload={(file) => handleFile(material.id, "epub", file)} />
              ) : null}
              {canManage && (
                <Button onClick={() => handleDelete(material.id)} variant="secondary" size="sm" pill className="ml-auto">
                  удалить
                </Button>
              )}
            </div>
          </Accordion>
        </div>
      ))}

      {canManage && (
        <Button onClick={handleAdd} variant="dashed" size="sm" pill>
          + книга
        </Button>
      )}
    </div>
  );
}

function HandoutsList({
  studentId,
  materials,
  guides,
  canManage,
}: {
  studentId: string;
  materials: MaterialRow[];
  guides: CabinetGuide[];
  canManage: boolean;
}) {
  const { items: handouts, setItems: setHandouts, startTransition, saveTitle, addItem } = useEditableMaterials(materials);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [freshId, setFreshId] = useState<string | null>(null);

  const drag = useDrag(handouts, setHandouts, (ids) =>
    startTransition(() => reorderMaterials(studentId, ids))
  );

  function handleAdd() {
    addItem(studentId, "HANDOUT", (row) => {
      setFreshId(row.id);
      setOpenIds((prev) => ({ ...prev, [row.id]: true }));
    });
  }

  function handleFile(id: string, file: File) {
    startTransition(async () => {
      const { fileName, dataUrl } = await uploadFile("material", id, "file", file);
      setHandouts((prev) => prev.map((m) => (m.id === id ? { ...m, fileHref: dataUrl, fileName, fileBytes: dataUrlBytes(dataUrl) } : m)));
    });
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить методичку?"))) return;
    setHandouts((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => deleteMaterial(id));
  }

  function handleStatus(id: string, current: MaterialStatus) {
    const next = nextMaterialStatus(current);
    setHandouts((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
    startTransition(async () => { await cycleMaterialStatus(id); });
  }

  const showLibrary = canManage || guides.length > 0;
  const showPersonalHeading = guides.length > 0 && (handouts.length > 0 || canManage);

  return (
    <div>
      {!canManage && guides.length === 0 && handouts.length === 0 ? (
        <EmptyState
          cue="Самое время читать"
          detail="Здесь появятся методички студии и личные файлы."
        />
      ) : null}
      {showLibrary && (
        <div className="mb-8">
          <h2 className="heading text-[18px] mb-1">{canManage ? "Общая библиотека" : "Методички студии"}</h2>
          {canManage ? (
            <p className="text-[13px] mb-3">
              <Link href="/mentor/guides" className="lnk">
                К библиотеке
              </Link>
            </p>
          ) : null}
          {guides.length === 0 ? (
            <EmptyState
              compact
              cue={canManage ? "Самое время собрать библиотеку" : "Самое время читать"}
              detail={canManage ? "Добавьте методичку — её увидят в кабинетах." : "Методички студии появятся здесь."}
            />
          ) : (
            <LibraryGuides studentId={studentId} guides={guides} canManage={canManage} />
          )}
        </div>
      )}

      {showPersonalHeading ? <h2 className="heading text-[18px] mb-2">Личные методички</h2> : null}

      {handouts.map((material) => {
        const open = openIds[material.id] ?? false;
        return (
        <article
          key={material.id}
          draggable={canManage && armedId === material.id}
          onDragStart={() => drag.onDragStart(material.id)}
          onDragOver={(e) => drag.onDragOver(e, material.id)}
          onDrop={drag.onDrop}
          onDragEnd={() => setArmedId(null)}
          onMouseUp={() => setArmedId(null)}
          className="group mb-3 rounded-[24px] px-4 py-3.5"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          <div
            className="flex cursor-pointer items-start justify-between gap-3"
            role="button"
            tabIndex={0}
            aria-expanded={open}
            onClick={() => setOpenIds((prev) => toggleOpenId(prev, material.id))}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              setOpenIds((prev) => toggleOpenId(prev, material.id));
            }}
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1 grid h-5 w-5 shrink-0 place-items-center"
                title={open ? "Свернуть" : "Развернуть"}
              >
                <ChevronDown size={15} className={`chevron-turn${open ? " is-open" : ""}`} />
              </span>
              {canManage && (
                <GripVertical
                  size={14}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setArmedId(material.id);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="mt-1 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--ink-faint)" }}
                />
              )}
              {canManage ? (
                <InlineTitle
                  value={material.title}
                  autoFocus={material.id === freshId}
                  placeholder="Название методички"
                  onSave={(value) => saveTitle(material.id, value)}
                  className="heading text-[17px]"
                  bubbleTitle
                />
              ) : (
                <span className="heading min-w-0 flex-1 text-[17px] font-semibold">{material.title || "Без названия"}</span>
              )}
            </div>
            <span
              onClick={(event) => {
                event.stopPropagation();
                handleStatus(material.id, material.status);
              }}
              className="cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-[12px]"
              style={MATERIAL_STATUS_STYLE[material.status]}
            >
              {MATERIAL_STATUS_LABEL[material.status]}
            </span>
          </div>
          <Collapse open={open} className="mt-3 flex flex-wrap items-center gap-3">
            {material.fileHref ? (
              <DownloadButton href={material.fileHref} fileName={material.fileName} bytes={material.fileBytes} />
            ) : canManage ? (
              <FileAttachBox label="+ файл" onUpload={(file) => handleFile(material.id, file)} />
            ) : (
              <span className="text-[13px]" style={{ color: "var(--ink-faint)" }}>файл пока не загружен</span>
            )}
            {canManage && (
              <Button onClick={() => handleDelete(material.id)} variant="secondary" size="sm" pill className="ml-auto">
                удалить
              </Button>
            )}
          </Collapse>
        </article>
        );
      })}

      {canManage && (
        <Button onClick={handleAdd} variant="dashed" size="sm" pill className="mt-3">
          + методичка
        </Button>
      )}
    </div>
  );
}

export default function MaterialsList({
  studentId,
  initialMaterials,
  guides,
  canManage,
  initialTab = 0,
}: {
  studentId: string;
  initialMaterials: MaterialRow[];
  guides: CabinetGuide[];
  canManage: boolean;
  initialTab?: number;
}) {
  const books = initialMaterials.filter((m) => m.category === "BOOK");
  const handouts = initialMaterials.filter((m) => m.category === "HANDOUT");

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
      <section className="sheet px-5 pt-4 pb-3" style={{ order: initialTab === 1 ? 2 : 0 }}>
        <h2 className="mb-2 text-[18px] font-semibold">Книги</h2>
        <BooksList studentId={studentId} materials={books} canManage={canManage} />
      </section>
      <section className="sheet px-5 pt-4 pb-3" style={{ order: initialTab === 1 ? 0 : 1 }}>
        <h2 className="mb-2 text-[18px] font-semibold">Методички</h2>
        <HandoutsList studentId={studentId} materials={handouts} guides={guides} canManage={canManage} />
      </section>
    </div>
  );
}
