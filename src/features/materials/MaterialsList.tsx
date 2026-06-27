"use client";

import { useState, useTransition } from "react";
import type { Material } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import FileAttachBox from "@/components/FileAttachBox";
import Subtabs from "@/components/Subtabs";
import { uploadFile } from "@/lib/uploadFile";
import { blurOnEnter } from "@/lib/blurOnEnter";
import {
  createMaterial,
  updateMaterialTitle,
  cycleMaterialStatus,
  deleteMaterial,
} from "./actions";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_STYLE, nextMaterialStatus } from "./status";
import { Button } from "@/components/ui/Button";

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
  onUpload: (file: File) => void;
}) {
  if (fileUrl) {
    return (
      <a
        href={fileUrl}
        download={fileName ?? undefined}
        className="text-[13px] px-2.5 py-1 rounded-sm inline-block"
        style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
      >
        Скачать {label}
      </a>
    );
  }
  if (canManage) {
    return <FileAttachBox label={label === "файл" ? "+ файл" : `+ файл ${label}`} onUpload={onUpload} />;
  }
  return (
    <span className="text-[13px]" style={{ color: "var(--faded)" }}>
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
              onKeyDown={blurOnEnter}
              placeholder="Название книги"
              className="heading w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-3"
              style={{ borderColor: "var(--rule)" }}
            />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <DownloadOrUpload
              label="PDF"
              fileUrl={material.pdfUrl}
              fileName={material.pdfName}
              canManage={canManage}
              onUpload={(file) => handleFile(material.id, "pdf", file)}
            />
            <DownloadOrUpload
              label="EPUB"
              fileUrl={material.epubUrl}
              fileName={material.epubName}
              canManage={canManage}
              onUpload={(file) => handleFile(material.id, "epub", file)}
            />
            {canManage && (
              <Button onClick={() => handleDelete(material.id)} variant="secondary" size="sm" className="ml-auto">
                Удалить
              </Button>
            )}
          </div>
        </Accordion>
      ))}

      {canManage && (
        <Button onClick={handleAdd} variant="secondary" size="sm">
          + книга
        </Button>
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
    startTransition(() => {
      cycleMaterialStatus(id);
    });
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
              onKeyDown={blurOnEnter}
              placeholder="Название методички"
              className="heading flex-1 min-w-0 outline-none bg-transparent text-[15px] font-semibold"
            />
          ) : (
            <span className="heading flex-1 min-w-0 text-[15px] font-semibold">{material.title || "Без названия"}</span>
          )}
          <span
            onClick={() => handleStatus(material.id, material.status)}
            className="font-mono-label text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
            style={MATERIAL_STATUS_STYLE[material.status]}
          >
            {MATERIAL_STATUS_LABEL[material.status]}
          </span>
          <DownloadOrUpload
            label="файл"
            fileUrl={material.fileUrl}
            fileName={material.fileName}
            canManage={canManage}
            onUpload={(file) => handleFile(material.id, file)}
          />
          {canManage && (
            <Button onClick={() => handleDelete(material.id)} variant="secondary" size="sm">
              Удалить
            </Button>
          )}
        </div>
      ))}

      {canManage && (
        <Button onClick={handleAdd} variant="secondary" size="sm" className="mt-3">
          + методичка
        </Button>
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
    <div style={{ maxWidth: 720 }}>
      <Subtabs
        tabs={[
          { label: "Книги", content: <BooksList studentId={studentId} materials={books} canManage={canManage} /> },
          { label: "Методички", content: <HandoutsList studentId={studentId} materials={handouts} canManage={canManage} /> },
        ]}
      />
    </div>
  );
}
