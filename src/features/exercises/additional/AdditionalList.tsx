"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import type { FreeSection, Comment, TaskStatus } from "@/generated/prisma/client";
import Accordion from "@/components/Accordion";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import CardSaveButton from "@/components/CardSaveButton";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { useCanSuggest } from "@/features/suggestions/SuggestionContext";
import CommentsBlock from "@/features/comments/CommentsBlock";
import { blurOnEnter } from "@/lib/blurOnEnter";
import InlineTitle from "@/components/InlineTitle";
import {
  createAdditionalSection,
  saveSectionBody,
  updateSectionTitle,
  updateTableCell,
  resizeTable,
  deleteAdditionalSection,
  setSectionStatus,
} from "./actions";
import WritingEditor from "./WritingEditor";
import WritingMode from "./WritingMode";
import type { ContentFormat } from "./richText";
import { Button } from "@/components/ui/Button";
import ExerciseStatusControl from "@/features/exercises/ExerciseStatusControl";

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
          <label className="text-[13px]" style={{ color: "var(--muted)" }}>
            Строк:
          </label>
          <input
            type="number"
            min={1}
            defaultValue={grid.length}
            onBlur={(e) => handleResize(Number(e.target.value) || grid.length, grid[0]?.length || 2)}
            onKeyDown={blurOnEnter}
            className="fld !h-9 w-16 px-2 text-center text-[13px]"
          />
          <label className="text-[13px]" style={{ color: "var(--muted)" }}>
            Столбцов:
          </label>
          <input
            type="number"
            min={1}
            defaultValue={grid[0]?.length ?? 2}
            onBlur={(e) => handleResize(grid.length, Number(e.target.value) || grid[0]?.length || 2)}
            onKeyDown={blurOnEnter}
            className="fld !h-9 w-16 px-2 text-center text-[13px]"
          />
      </div>
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "collapse" }}>
          <tbody>
            {grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ border: "1px solid var(--border)", verticalAlign: "top" }}>
                    <AutoGrowTextarea
                      defaultValue={cell}
                      onBlur={(value) => handleCell(ri, ci, value)}
                      className="outline-none bg-transparent text-[13px] px-2.5 py-2"
                      style={{ width: 160, minHeight: 36, overflowWrap: "anywhere" }}
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

function saveLabel(status: "saved" | "saving" | "suggested" | "error") {
  if (status === "saving") return "Сохраняем…";
  if (status === "suggested") return "Предложение записано";
  if (status === "error") return "Не удалось сохранить";
  return "Сохранено";
}

function TextCard({
  section,
  suggestions,
  writing,
  onWriting,
}: {
  section: FreeSection;
  suggestions: Record<string, string>;
  writing: boolean;
  onWriting: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const suggesting = useCanSuggest() && pathname.startsWith("/student-view");
  const storedFormat: ContentFormat = section.contentFormat === "markdown" ? "markdown" : "plain";
  const startingFormat: ContentFormat =
    suggesting && suggestions.contentFormat === "markdown" ? "markdown" : storedFormat;
  const startingContent = suggesting && suggestions.content ? suggestions.content : section.content;
  const [content, setContent] = useState(startingContent);
  const [format, setFormat] = useState<ContentFormat>(startingFormat);
  const [status, setStatus] = useState<"saved" | "saving" | "suggested" | "error">("saved");
  const latest = useRef({ content: startingContent, format: startingFormat });
  const ticket = useRef(0);
  const timer = useRef<number | null>(null);

  async function flush() {
    if (timer.current) window.clearTimeout(timer.current);
    const mine = ++ticket.current;
    const snap = latest.current;
    try {
      const result = await saveSectionBody(section.id, snap.content, snap.format);
      if (mine !== ticket.current) return;
      if (latest.current.content !== snap.content || latest.current.format !== snap.format) {
        await flush();
        return;
      }
      setStatus(result.suggested ? "suggested" : "saved");
    } catch {
      if (mine === ticket.current) setStatus("error");
    }
  }

  function onChange(next: string, nextFormat: ContentFormat) {
    if (next === latest.current.content && nextFormat === latest.current.format) return;
    latest.current = { content: next, format: nextFormat };
    setContent(next);
    setFormat(nextFormat);
    setStatus("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void flush();
    }, 650);
  }

  const editor = (
    <WritingEditor
      key={writing ? "focus" : "card"}
      value={content}
      format={format}
      variant={writing ? "focus" : "card"}
      onChange={onChange}
    />
  );

  const openWriting = (
    <button type="button" className="writing-mode-open" onClick={() => { void flush(); onWriting(true); }}>
      Режим письма
    </button>
  );

  if (suggestions.content && !suggesting && !writing) {
    return (
      <div className="writing-card">
        <div className="writing-card-bar">
          {openWriting}
        </div>
        <SuggestableField
          model="FreeSection"
          recordId={section.id}
          field="content"
          value={section.content}
          suggestion={suggestions.content}
          placeholder="Напишите здесь"
          className="reading outline-none bg-transparent"
          style={{ width: "100%" }}
          resizable
        />
      </div>
    );
  }

  return writing ? (
    <WritingMode title={section.title} saveLabel={saveLabel(status)} onClose={() => { void flush(); onWriting(false); }}>
      {editor}
    </WritingMode>
  ) : (
    <div className="writing-card">
      <div className="writing-card-bar">
        <span className="writing-mode-save">{saveLabel(status)}</span>
        {openWriting}
      </div>
      {editor}
    </div>
  );
}

function SectionBody({
  section,
  isMentorViewer,
  suggestions,
  comments,
  onDelete,
  writing,
  onWriting,
}: {
  section: FreeSection;
  isMentorViewer: boolean;
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
  onDelete: (id: string) => void;
  writing: boolean;
  onWriting: (open: boolean) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Свою карточку ученик переименовывает и удаляет сам, карточки наставника — нет.
  const canManage = isMentorViewer || section.createdByStudent;

  return (
    <div ref={rootRef}>
      {section.type === "TEXT" ? (
        <TextCard
          section={section}
          suggestions={suggestions[section.id] ?? {}}
          writing={writing}
          onWriting={onWriting}
        />
      ) : (
        <TableSection section={section} onResize={() => {}} />
      )}

      <div className="flex gap-1.5 mt-3">
        <CardSaveButton scopeRef={rootRef} />
        {canManage && (
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
  const [freshId, setFreshId] = useState<string | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAdd(type: "TEXT" | "TABLE") {
    startTransition(async () => {
      const section = await createAdditionalSection(studentId, type, 2, 2);
      setFreshId(section.id);
      setSections((prev) => [...prev, section]);
    });
  }

  function handleTitle(id: string, value: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, title: value } : s)));
    startTransition(() => updateSectionTitle(id, value));
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить раздел?"))) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteAdditionalSection(id));
  }

  function handleStatus(id: string, status: TaskStatus) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    startTransition(() => {
      void setSectionStatus(id, status);
    });
  }

  return (
    <div className="additional-board">
      <div className="flex gap-2.5 mb-4">
        <Button onClick={() => handleAdd("TEXT")} variant="secondary" size="sm" pill>
          + текст
        </Button>
        <Button onClick={() => handleAdd("TABLE")} variant="secondary" size="sm" pill>
          + таблица
        </Button>
      </div>
      {sections.map((section) => {
        const canRename = isMentorViewer || section.createdByStudent;
        return (
        <Accordion
          key={section.id}
          defaultOpen={section.id === freshId || section.id === writingId}
          wrapHeader
          title={canRename ? (
            <InlineTitle
              value={section.title}
              autoFocus={section.id === freshId}
              placeholder={section.type === "TABLE" ? "Название таблицы" : "Вопрос"}
              onSave={(value) => handleTitle(section.id, value)}
              className="text-[14.5px]"
            />
          ) : (section.title || "Без названия")}
          headerExtra={
            <>
              {section.type === "TEXT" && (
                <button
                  type="button"
                  className="writing-mode-open"
                  onClick={(event) => {
                    event.stopPropagation();
                    setWritingId(section.id);
                  }}
                >
                  Режим письма
                </button>
              )}
              <ExerciseStatusControl
                status={section.status}
                isMentor={isMentorViewer}
                onChange={(status) => handleStatus(section.id, status)}
              />
            </>
          }
        >
          <SectionBody
            section={section}
            isMentorViewer={isMentorViewer}
            suggestions={suggestions}
            comments={comments}
            onDelete={handleDelete}
            writing={writingId === section.id}
            onWriting={(open) => setWritingId(open ? section.id : null)}
          />
        </Accordion>
        );
      })}

    </div>
  );
}
