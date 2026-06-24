"use client";

import { useState, useTransition } from "react";
import type { FreeSection, Comment } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import {
  createAdditionalSection,
  updateSectionTitle,
  updateTableCell,
  resizeTable,
  deleteAdditionalSection,
} from "./actions";

function TableSection({
  section,
  onResize,
}: {
  section: FreeSection;
  onResize: (grid: string[][]) => void;
}) {
  const [grid, setGrid] = useState<string[][]>((section.tableData as string[][]) ?? [["", ""], ["", ""]]);
  const [, startTransition] = useTransition();

  function handleCell(row: number, col: number, value: string) {
    setGrid((prev) => prev.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? value : c)) : r)));
    startTransition(() => updateTableCell(section.id, row, col, value));
  }

  function handleResize(rows: number, cols: number) {
    startTransition(async () => {
      const newGrid = await resizeTable(section.id, rows, cols);
      setGrid(newGrid);
      onResize(newGrid);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
          <label className="font-mono-label text-[10px] uppercase" style={{ color: "var(--faded)" }}>
            Строк:
          </label>
          <input
            type="number"
            min={1}
            defaultValue={grid.length}
            onBlur={(e) => handleResize(Number(e.target.value) || grid.length, grid[0]?.length || 2)}
            className="w-14 text-[13px] px-1.5 py-1 rounded-sm"
            style={{ border: "1px solid var(--rule)" }}
          />
          <label className="font-mono-label text-[10px] uppercase" style={{ color: "var(--faded)" }}>
            Столбцов:
          </label>
          <input
            type="number"
            min={1}
            defaultValue={grid[0]?.length ?? 2}
            onBlur={(e) => handleResize(grid.length, Number(e.target.value) || grid[0]?.length || 2)}
            className="w-14 text-[13px] px-1.5 py-1 rounded-sm"
            style={{ border: "1px solid var(--rule)" }}
          />
      </div>
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "collapse" }}>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: "1px solid var(--rule)" }}>
                    <input
                      defaultValue={cell}
                      onBlur={(e) => handleCell(ri, ci, e.target.value)}
                      className="outline-none bg-transparent text-[13px] px-2.5 py-2"
                      style={{ width: 140 }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdditionalList({
  studentId,
  initialSections,
  isMentorViewer,
  suggestions,
  comments,
}: {
  studentId: string;
  initialSections: FreeSection[];
  isMentorViewer: boolean;
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
}) {
  const [sections, setSections] = useState(initialSections);
  const [, startTransition] = useTransition();

  function handleAdd(type: "TEXT" | "TABLE") {
    startTransition(async () => {
      const section = await createAdditionalSection(studentId, type, 2, 2);
      setSections((prev) => [...prev, section]);
    });
  }

  function handleTitle(id: string, value: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: value } : s)));
    startTransition(() => updateSectionTitle(id, value));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить раздел?")) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteAdditionalSection(id));
  }

  return (
    <div>
      {sections.map((section) => (
        <Accordion key={section.id} title={section.title || "Без названия"} defaultOpen>
          {isMentorViewer ? (
            <input
              defaultValue={section.title}
              onBlur={(e) => handleTitle(section.id, e.target.value)}
              placeholder={section.type === "TABLE" ? "Название таблицы" : "Вопрос"}
              className="heading w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-3"
              style={{ borderColor: "var(--rule)" }}
            />
          ) : (
            section.type === "TEXT" && (
              <p className="heading text-[14px] font-semibold mb-3">{section.title}</p>
            )
          )}

          {section.type === "TEXT" ? (
            <SuggestableField
              model="FreeSection"
              recordId={section.id}
              field="content"
              value={section.content}
              suggestion={suggestions[section.id]?.content}
              placeholder="Ответ..."
              className="w-full outline-none bg-transparent text-[13.5px] leading-relaxed"
            />
          ) : (
            <TableSection section={section} onResize={() => {}} />
          )}

          {isMentorViewer && (
            <button
              onClick={() => handleDelete(section.id)}
              className="font-mono-label text-[10px] px-2.5 py-1 rounded-sm mt-3"
              style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
            >
              Удалить раздел
            </button>
          )}

          <CommentsBlock model="FreeSection" recordId={section.id} initialComments={comments[section.id] ?? []} />
        </Accordion>
      ))}

      {isMentorViewer && (
        <div className="flex gap-2.5">
          <button
            onClick={() => handleAdd("TEXT")}
            className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
            style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
          >
            + текст (вопрос-ответ)
          </button>
          <button
            onClick={() => handleAdd("TABLE")}
            className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
            style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
          >
            + таблица
          </button>
        </div>
      )}
    </div>
  );
}
