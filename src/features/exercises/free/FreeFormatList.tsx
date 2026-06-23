"use client";

import { useState, useTransition } from "react";
import type { FreeSection } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { createFreeSection, updateFreeSectionField, deleteFreeSection } from "./actions";

export default function FreeFormatList({
  studentId,
  initialSections,
}: {
  studentId: string;
  initialSections: FreeSection[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const section = await createFreeSection(studentId);
      setSections((prev) => [...prev, section]);
    });
  }

  function handleField(id: string, field: "title" | "content", value: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    startTransition(() => updateFreeSectionField(id, field, value));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить раздел?")) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteFreeSection(id));
  }

  return (
    <div>
      {sections.map((section) => (
        <Accordion key={section.id} title={section.title || "Без названия"} defaultOpen>
          <input
            defaultValue={section.title}
            onBlur={(e) => handleField(section.id, "title", e.target.value)}
            placeholder="Название раздела"
            className="w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-3"
            style={{ borderColor: "var(--rule)" }}
          />
          <AutoGrowTextarea
            defaultValue={section.content}
            onBlur={(v) => handleField(section.id, "content", v)}
            placeholder="Свободное содержимое: текст, список, заметки..."
            className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed"
          />
          <button
            onClick={() => handleDelete(section.id)}
            className="font-mono-label text-[10px] px-2.5 py-1 rounded-sm mt-3"
            style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
          >
            Удалить раздел
          </button>
        </Accordion>
      ))}

      <button
        onClick={handleAdd}
        className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + добавить раздел
      </button>
    </div>
  );
}
