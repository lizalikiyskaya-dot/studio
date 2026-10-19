"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import type { Material } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import FileAttachBox from "@/components/FileAttachBox";
import { uploadFile } from "@/lib/uploadFile";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { GripVertical } from "lucide-react";
import {
  createMaterial,
  updateMaterialTitle,
  cycleMaterialStatus,
  deleteMaterial,
  reorderMaterials,
} from "./actions";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_STYLE, nextMaterialStatus } from "./status";
import { Button } from "@/components/ui/Button";
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

function BooksList({
  studentId,
  materials,
  canManage,
}: {
  studentId: string;
  materials: Material[];
  canManage: boolean;
}) {
  const [books, setBooks] = useState(materials);
  // Card is draggable ONLY while its grip handle is held — otherwise the
  // whole card grabs mousedown and hijacks text selection / cut.
  const [armedId, setArmedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const drag = useDrag(books, setBooks, (ids) =>
    startTransition(() => reorderMaterials(studentId, ids))
  );

  function handleAdd() {
    startTransition(async () => {
      const material = await createMaterial(studentId, "BOOK");
      setBooks((prev) => [...prev, material]);
    });
  }

  function handleTitle(id: string, value: string) {
    setBooks((prev) => prev.map((m) => (m.id === id ? { ...m, title: value } : m)));
    startTransition(() => updateMaterialTitle(id, value));
  }

  function handleFile(id: string, field: "pdf" | "epub", file: File) {
    startTransition(async () => {
      const { fileName, dataUrl } = await uploadFile("material", id, field, file);
      setBooks((prev) =>
        prev.map((m) =>
          m.id === id
            ? field === "pdf"
              ? { ...m, pdfUrl: dataUrl, pdfName: fileName }
              : { ...m, epubUrl: dataUrl, epubName: fileName }
            : m
        )
      );
    });
  }

  function handleStatus(id: string, current: Material["status"]) {
    const next = nextMaterialStatus(current);
    setBooks((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
    startTransition(async () => { await cycleMaterialStatus(id); });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить книгу?")) return;
    setBooks((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => deleteMaterial(id));
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
            title={material.title || "Без названия"}
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
            }
          >
            {canManage && (
              <input
                defaultValue={material.title}
                onBlur={(e) => handleTitle(material.id, e.target.value)}
                onKeyDown={blurOnEnter}
                placeholder="Название книги"
                className="heading w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-3"
                style={{ borderColor: "var(--border)" }}
              />
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {material.pdfUrl ? (
                <DownloadButton href={material.pdfUrl} fileName={material.pdfName} mime="application/pdf" bytes={dataUrlBytes(material.pdfUrl)} />
              ) : canManage ? (
                <FileAttachBox label="+ файл PDF" onUpload={(file) => handleFile(material.id, "pdf", file)} />
              ) : (
                <span className="text-[13px]" style={{ color: "var(--ink-faint)" }}>PDF пока не загружен</span>
              )}
              {material.epubUrl ? (
                <DownloadButton href={material.epubUrl} fileName={material.epubName} mime="application/epub+zip" bytes={dataUrlBytes(material.epubUrl)} />
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
  materials: Material[];
  guides: CabinetGuide[];
  canManage: boolean;
}) {
  const [handouts, setHandouts] = useState(materials);
  const [armedId, setArmedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const drag = useDrag(handouts, setHandouts, (ids) =>
    startTransition(() => reorderMaterials(studentId, ids))
  );

  function handleAdd() {
    startTransition(async () => {
      const material = await createMaterial(studentId, "HANDOUT");
      setHandouts((prev) => [...prev, material]);
    });
  }

  function handleTitle(id: string, value: string) {
    setHandouts((prev) => prev.map((m) => (m.id === id ? { ...m, title: value } : m)));
    startTransition(() => updateMaterialTitle(id, value));
  }

  function handleFile(id: string, file: File) {
    startTransition(async () => {
      const { fileName, dataUrl } = await uploadFile("material", id, "file", file);
      setHandouts((prev) => prev.map((m) => (m.id === id ? { ...m, fileUrl: dataUrl, fileName } : m)));
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить методичку?")) return;
    setHandouts((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => deleteMaterial(id));
  }

  function handleStatus(id: string, current: Material["status"]) {
    const next = nextMaterialStatus(current);
    setHandouts((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
    startTransition(async () => { await cycleMaterialStatus(id); });
  }

  const showLibrary = canManage || guides.length > 0;
  const showPersonalHeading = guides.length > 0 && (handouts.length > 0 || canManage);

  return (
    <div>
      {!canManage && guides.length === 0 && handouts.length === 0 ? (
        <p className="text-[14px]" style={{ color: "var(--muted)" }}>
          Методичек пока нет.
        </p>
      ) : null}
      {showLibrary && (
        <div className="mb-8">
          <h2 className="heading text-[18px] mb-1">{canManage ? "Общая библиотека" : "Методички студии"}</h2>
          {canManage ? (
            <p className="text-[13px] mb-3" style={{ color: "var(--muted)" }}>
              Скрытая методичка в этом кабинете не видна и не скачивается.{" "}
              <Link href="/mentor/guides" className="lnk">
                К библиотеке
              </Link>
            </p>
          ) : null}
          {guides.length === 0 ? (
            <p className="text-[14px]" style={{ color: "var(--muted)" }}>
              В библиотеке пока ничего нет.
            </p>
          ) : (
            <LibraryGuides studentId={studentId} guides={guides} canManage={canManage} />
          )}
        </div>
      )}

      {showPersonalHeading ? <h2 className="heading text-[18px] mb-2">Личные методички</h2> : null}

      {handouts.map((material) => (
        <article
          key={material.id}
          draggable={canManage && armedId === material.id}
          onDragStart={() => drag.onDragStart(material.id)}
          onDragOver={(e) => drag.onDragOver(e, material.id)}
          onDrop={drag.onDrop}
          onDragEnd={() => setArmedId(null)}
          onMouseUp={() => setArmedId(null)}
          className="hover-lift group mb-3 rounded-[24px] px-4 py-3.5"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {canManage && (
                <GripVertical
                  size={14}
                  onMouseDown={() => setArmedId(material.id)}
                  className="mt-1 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--ink-faint)" }}
                />
              )}
              {canManage ? (
                <input
                  defaultValue={material.title}
                  onBlur={(e) => handleTitle(material.id, e.target.value)}
                  onKeyDown={blurOnEnter}
                  placeholder="Название методички"
                  className="heading min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none"
                />
              ) : (
                <span className="heading min-w-0 flex-1 text-[17px] font-semibold">{material.title || "Без названия"}</span>
              )}
            </div>
            <span
              onClick={() => handleStatus(material.id, material.status)}
              className="cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-[12px]"
              style={MATERIAL_STATUS_STYLE[material.status]}
            >
              {MATERIAL_STATUS_LABEL[material.status]}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {material.fileUrl ? (
              <DownloadButton href={material.fileUrl} fileName={material.fileName} bytes={dataUrlBytes(material.fileUrl)} />
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
          </div>
        </article>
      ))}

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
  initialMaterials: Material[];
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
