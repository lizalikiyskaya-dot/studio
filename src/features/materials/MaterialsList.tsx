"use client";

import { useState, useTransition } from "react";
import type { Material } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import FileAttachBox from "@/components/FileAttachBox";
import Subtabs from "@/components/Subtabs";
import {
  createMaterial,
  updateMaterialTitle,
  updateMaterialFile,
  cycleMaterialStatus,
  deleteMaterial,
} from "./actions";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_STYLE, nextMaterialStatus } from "./status";

function DownloadOrUpload({
  label,
  fileUrl,
  fileName,
  canManage,
  onUpload,
}: {
  label: string;
  fileUrl: string | null;
  fileName: string | null;
  canManage: boolean;
  onUpload: (fileName: string, dataUrl: string) => void;
}) {
  if (fileUrl) {
    return (
      <a
        href={fileUrl}
        download={fileName ?? undefined}
        className="font-mono-label text-[11px] px-2.5 py-1 rounded-sm inline-block"
        style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
      >
        Скачать {label}
      </a>
    );
  }
  if (canManage) {
    return <FileAttachBox onUpload={onUpload} />;
  }
  return (
    <span className="font-mono-label text-[11px]" style={{ color: "var(--faded)" }}>
      файл пока не загружен
    </span>
  );
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
  const [, startTransition] = useTransition();

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

  function handleFile(id: string, field: "pdf" | "epub", fileName: string, dataUrl: string) {
    setBooks((prev) =>
      prev.map((m) =>
        m.id === id
          ? field === "pdf"
            ? { ...m, pdfUrl: dataUrl, pdfName: fileName }
            : { ...m, epubUrl: dataUrl, epubName: fileName }
          : m
      )
    );
    startTransition(() => updateMaterialFile(id, field, fileName, dataUrl));
  }

  function handleStatus(id: string, current: Material["status"]) {
    const next = nextMaterialStatus(current);
    setBooks((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
    startTransition(() => {
      cycleMaterialStatus(id);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить книгу?")) return;
    setBooks((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => deleteMaterial(id));
  }

  return (
    <div>
      {books.map((material) => (
        <Accordion
          key={material.id}
          title={material.title || "Без названия"}
          headerExtra={
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleStatus(material.id, material.status);
              }}
              className="font-mono-label text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
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
              placeholder="Название книги"
              className="w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-3"
              style={{ borderColor: "var(--rule)" }}
            />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <DownloadOrUpload
              label="PDF"
              fileUrl={material.pdfUrl}
              fileName={material.pdfName}
              canManage={canManage}
              onUpload={(fileName, dataUrl) => handleFile(material.id, "pdf", fileName, dataUrl)}
            />
            <DownloadOrUpload
              label="EPUB"
              fileUrl={material.epubUrl}
              fileName={material.epubName}
              canManage={canManage}
              onUpload={(fileName, dataUrl) => handleFile(material.id, "epub", fileName, dataUrl)}
            />
            {canManage && (
              <button
                onClick={() => handleDelete(material.id)}
                className="font-mono-label text-[10px] px-2.5 py-1 rounded-sm ml-auto"
                style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
              >
                Удалить
              </button>
            )}
          </div>
        </Accordion>
      ))}

      {canManage && (
        <button
          onClick={handleAdd}
          className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
          style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
        >
          + книга
        </button>
      )}
    </div>
  );
}

function HandoutsList({
  studentId,
  materials,
  canManage,
}: {
  studentId: string;
  materials: Material[];
  canManage: boolean;
}) {
  const [handouts, setHandouts] = useState(materials);
  const [, startTransition] = useTransition();

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

  function handleFile(id: string, fileName: string, dataUrl: string) {
    setHandouts((prev) => prev.map((m) => (m.id === id ? { ...m, fileUrl: dataUrl, fileName } : m)));
    startTransition(() => updateMaterialFile(id, "file", fileName, dataUrl));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить методичку?")) return;
    setHandouts((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => deleteMaterial(id));
  }

  return (
    <div>
      {handouts.map((material) => (
        <div
          key={material.id}
          className="flex items-center gap-3 py-3 border-b flex-wrap"
          style={{ borderColor: "var(--rule)" }}
        >
          {canManage ? (
            <input
              defaultValue={material.title}
              onBlur={(e) => handleTitle(material.id, e.target.value)}
              placeholder="Название методички"
              className="flex-1 min-w-0 outline-none bg-transparent text-[14px]"
            />
          ) : (
            <span className="flex-1 min-w-0 text-[14px]">{material.title || "Без названия"}</span>
          )}
          <DownloadOrUpload
            label="файл"
            fileUrl={material.fileUrl}
            fileName={material.fileName}
            canManage={canManage}
            onUpload={(fileName, dataUrl) => handleFile(material.id, fileName, dataUrl)}
          />
          {canManage && (
            <button
              onClick={() => handleDelete(material.id)}
              className="font-mono-label text-[10px] px-2.5 py-1 rounded-sm"
              style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
            >
              Удалить
            </button>
          )}
        </div>
      ))}

      {canManage && (
        <button
          onClick={handleAdd}
          className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm mt-3"
          style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
        >
          + методичка
        </button>
      )}
    </div>
  );
}

export default function MaterialsList({
  studentId,
  initialMaterials,
  canManage,
}: {
  studentId: string;
  initialMaterials: Material[];
  canManage: boolean;
}) {
  const books = initialMaterials.filter((m) => m.category === "BOOK");
  const handouts = initialMaterials.filter((m) => m.category === "HANDOUT");

  return (
    <Subtabs
      tabs={[
        { label: "Книги", content: <BooksList studentId={studentId} materials={books} canManage={canManage} /> },
        { label: "Методички", content: <HandoutsList studentId={studentId} materials={handouts} canManage={canManage} /> },
      ]}
    />
  );
}
