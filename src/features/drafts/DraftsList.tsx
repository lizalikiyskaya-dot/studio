"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useState, useTransition, useRef } from "react";
import type { Draft } from "@/generated/prisma/client";
import FileAttachBox from "@/components/FileAttachBox";
import { uploadFile } from "@/lib/uploadFile";
import { createDraft, updateDraftField, deleteDraft, reorderDrafts } from "./actions";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { EntryLink, EntryNote, EntryTitle } from "@/features/entries/EntryParts";
import { GripVertical, Plus, Trash2 } from "lucide-react";

function draftDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default function DraftsList({
  studentId,
  initialDrafts,
}: {
  studentId: string;
  initialDrafts: Draft[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  // Card is draggable ONLY while the grip handle is held, so selecting the
  // title / cutting text elsewhere doesn't get hijacked into a drag.
  const [armedId, setArmedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  function handleAdd() {
    startTransition(async () => {
      const draft = await createDraft(studentId);
      setDrafts((prev) => [...prev, draft]);
    });
  }

  function handleField(id: string, field: "title" | "note" | "link", value: string) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
    startTransition(() => updateDraftField(id, field, value));
  }

  function handleFile(id: string, file: File) {
    startTransition(async () => {
      const { fileName, dataUrl } = await uploadFile("draft", id, "file", file);
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, fileName, fileData: dataUrl } : d)));
    });
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить черновик?"))) return;
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    startTransition(() => deleteDraft(id));
  }

  function handleDragStart(id: string) {
    dragId.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    dragOverId.current = id;
  }

  function handleDrop() {
    const from = dragId.current;
    const to = dragOverId.current;
    if (!from || !to || from === to) return;
    setDrafts((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((d) => d.id === from);
      const toIdx = next.findIndex((d) => d.id === to);
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      startTransition(() => reorderDrafts(studentId, next.map((d) => d.id)));
      return next;
    });
    dragId.current = null;
    dragOverId.current = null;
  }

  return (
    <div>
      <PageHeader
        title="Рукописи"
        actions={
          <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Добавить рукопись
          </button>
        }
      />
      {drafts.length === 0 ? (
        <EmptyState
          cue="Самое время писать"
          detail="Черновики и рукописи появятся здесь."
          action={
            <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
              <Plus size={16} /> Добавить рукопись
            </button>
          }
        />
      ) : (
      <div className="draft-grid">
      {drafts.map((draft) => {
        const dateLabel = draftDate(draft.createdAt);
        return (
          <article
            key={draft.id}
            draggable={armedId === draft.id}
            onDragStart={() => handleDragStart(draft.id)}
            onDragOver={(e) => handleDragOver(e, draft.id)}
            onDrop={handleDrop}
            onDragEnd={() => setArmedId(null)}
            onMouseUp={() => setArmedId(null)}
            className="entry-card"
          >
            <div className="flex items-start gap-2">
              <GripVertical
                size={16}
                className="mt-1 shrink-0 cursor-grab active:cursor-grabbing"
                style={{ color: "var(--muted)" }}
                aria-hidden="true"
                onMouseDown={() => setArmedId(draft.id)}
              />
              <div className="min-w-0 flex-1">
                <EntryTitle
                  value={draft.title}
                  placeholder="Название рукописи"
                  onSave={(value) => handleField(draft.id, "title", value)}
                />
                {dateLabel ? <p className="draft-meta">{dateLabel}</p> : null}
              </div>
              <button type="button" className="entry-delete" aria-label="Удалить рукопись" onClick={() => handleDelete(draft.id)}>
                <Trash2 size={16} />
              </button>
            </div>
            <EntryNote value={draft.note} onSave={(value) => handleField(draft.id, "note", value)} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <EntryLink value={draft.link ?? ""} onSave={(value) => handleField(draft.id, "link", value)} />
              {draft.fileData ? (
                <a
                  href={draft.fileData}
                  download={draft.fileName ?? "файл"}
                  className="text-[13px] px-4 py-1.5 rounded-full inline-block"
                  style={{ color: "var(--vi)", border: "1px solid var(--v)" }}
                >
                  {draft.fileName ?? "скачать"}
                </a>
              ) : (
                <FileAttachBox fileName={null} onUpload={(file) => handleFile(draft.id, file)} />
              )}
            </div>
          </article>
        );
      })}
      </div>
      )}
    </div>
  );
}
