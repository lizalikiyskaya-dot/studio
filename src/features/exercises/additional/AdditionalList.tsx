"use client";

import { useRef, useState, useTransition } from "react";
import type { FreeSection, Comment, TaskStatus } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import CardSaveButton from "@/components/CardSaveButton";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { blurOnEnter } from "@/lib/blurOnEnter";
import {
  createAdditionalSection,
  updateSectionTitle,
  updateTableCell,
  resizeTable,
  deleteAdditionalSection,
  cycleSectionStatus,
} from "./actions";
import { Button } from "@/components/ui/Button";

const STATUS_LABEL: Record<TaskStatus, string> = {
  IN_PROGRESS: "в процессе",
  SUBMITTED: "сдано на проверку",
  NEEDS_REVISION: "на доработке",
  ACCEPTED: "принято",
};

const STATUS_STYLE: Record<TaskStatus, React.CSSProperties> = {
  IN_PROGRESS: { background: "var(--bg-surface-2)", color: "var(--faded)", border: "1px dashed var(--rule)" },
  SUBMITTED: { background: "#E2E9EE", color: "#3F6080", border: "none" },
  NEEDS_REVISION: { background: "var(--accent-soft)", color: "var(--wine)", border: "none" },
  ACCEPTED: { background: "var(--ink)", color: "#fff", border: "none" },
};

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
          <label className="text-[13px]" style={{ color: "var(--faded)" }}>
            Строк:
          </label>
          <input
            type="number"
            min={1}
            defaultValue={grid.length}
            onBlur={(e) => handleResize(Number(e.target.value) || grid.length, grid[0]?.length || 2)}
            onKeyDown={blurOnEnter}
            className="w-14 text-[13px] px-1.5 py-1 rounded-sm"
            style={{ border: "1px solid var(--rule)" }}
          />
          <label className="text-[13px]" style={{ color: "var(--faded)" }}>
            Столбцов:
          </label>
          <input
            type="number"
            min={1}
            defaultValue={grid[0]?.length ?? 2}
            onBlur={(e) => handleResize(grid.length, Number(e.target.value) || grid[0]?.length || 2)}
            onKeyDown={blurOnEnter}
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
                      onKeyDown={blurOnEnter}
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

function SectionBody({
  section,
  isMentorViewer,
  suggestions,
  comments,
  onTitle,
  onDelete,
}: {
  section: FreeSection;
  isMentorViewer: boolean;
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
  onTitle: (id: string, value: string) => void;
  onDelete: (id: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef}>
      {isMentorViewer ? (
        <input
          defaultValue={section.title}
          onBlur={(e) => onTitle(section.id, e.target.value)}
          onKeyDown={blurOnEnter}
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
          className="outline-none bg-transparent text-[13.5px] leading-relaxed"
          style={{ width: "100%" }}
          resizable
        />
      ) : (
        <TableSection section={section} onResize={() => {}} />
      )}

      <div className="flex gap-1.5 mt-3">
        <CardSaveButton scopeRef={rootRef} />
        {isMentorViewer && (
          <Button onClick={() => onDelete(section.id)} variant="secondary" size="sm" pill>
            удалить раздел
          </Button>
        )}
      </div>

      <CommentsBlock model="FreeSection" recordId={section.id} initialComments={comments[section.id] ?? []} />
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

  function handleStatus(id: string) {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const order: TaskStatus[] = ["IN_PROGRESS", "SUBMITTED", "NEEDS_REVISION", "ACCEPTED"];
        const next = order[(order.indexOf(s.status) + 1) % order.length];
        return { ...s, status: next };
      })
    );
    startTransition(() => {
      void cycleSectionStatus(id);
    });
  }

  return (
    <div>
      {sections.map((section) => (
        <Accordion
          key={section.id}
          title={section.title || "Без названия"}
          defaultOpen
          headerExtra={
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleStatus(section.id);
              }}
              className="text-[12px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
              style={STATUS_STYLE[section.status]}
            >
              {STATUS_LABEL[section.status]}
            </span>
          }
        >
          <SectionBody
            section={section}
            isMentorViewer={isMentorViewer}
            suggestions={suggestions}
            comments={comments}
            onTitle={handleTitle}
            onDelete={handleDelete}
          />
        </Accordion>
      ))}

      {isMentorViewer && (
        <div className="flex gap-2.5">
          <Button onClick={() => handleAdd("TEXT")} variant="dashed" size="sm" pill>
            + текст (вопрос-ответ)
          </Button>
          <Button onClick={() => handleAdd("TABLE")} variant="dashed" size="sm" pill>
            + таблица
          </Button>
        </div>
      )}
    </div>
  );
}
