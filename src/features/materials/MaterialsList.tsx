"use client";

import { useState, useTransition } from "react";
import type { Material } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import {
  createMaterial,
  updateMaterialTitle,
  updateMaterialLink,
  cycleMaterialStatus,
  deleteMaterial,
} from "./actions";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_STYLE, nextMaterialStatus } from "./status";

function LinkField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="font-mono-label text-[10px] uppercase w-12" style={{ color: "var(--faded)" }}>
        {label}
      </span>
      {value ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-[13px] break-all" style={{ color: "var(--wine)" }}>
          {value}
        </a>
      ) : (
        <button
          onClick={() => {
            const url = window.prompt(`Ссылка на ${label}`);
            if (url) onSave(url);
          }}
          className="font-mono-label text-[11px] px-2.5 py-1 rounded-sm"
          style={{ color: "var(--sage)", border: "1px solid var(--sage)" }}
        >
          + ссылка
        </button>
      )}
    </div>
  );
}

export default function MaterialsList({
  studentId,
  initialMaterials,
}: {
  studentId: string;
  initialMaterials: Material[];
}) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const material = await createMaterial(studentId);
      setMaterials((prev) => [...prev, material]);
    });
  }

  function handleTitle(id: string, value: string) {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, title: value } : m)));
    startTransition(() => updateMaterialTitle(id, value));
  }

  function handleLink(id: string, field: "pdfUrl" | "epubUrl", value: string) {
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
    startTransition(() => updateMaterialLink(id, field, value));
  }

  function handleStatus(id: string, current: Material["status"]) {
    const next = nextMaterialStatus(current);
    setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
    startTransition(() => {
      cycleMaterialStatus(id);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить материал?")) return;
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    startTransition(() => deleteMaterial(id));
  }

  return (
    <div>
      {materials.map((material) => (
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
          <input
            defaultValue={material.title}
            onBlur={(e) => handleTitle(material.id, e.target.value)}
            placeholder="Название книги"
            className="w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-3"
            style={{ borderColor: "var(--rule)" }}
          />
          <LinkField label="PDF" value={material.pdfUrl} onSave={(v) => handleLink(material.id, "pdfUrl", v)} />
          <LinkField label="EPUB" value={material.epubUrl} onSave={(v) => handleLink(material.id, "epubUrl", v)} />
          <button
            onClick={() => handleDelete(material.id)}
            className="font-mono-label text-[10px] px-2.5 py-1 rounded-sm mt-2"
            style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
          >
            Удалить
          </button>
        </Accordion>
      ))}

      <button
        onClick={handleAdd}
        className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + книга
      </button>
    </div>
  );
}
