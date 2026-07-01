"use client";

import { useState, useTransition, useRef } from "react";
import type { Draft } from "@/generated/prisma/client";
import FileAttachBox from "@/components/FileAttachBox";
import { uploadFile } from "@/lib/uploadFile";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { shortenUrl } from "@/lib/shortenUrl";
import { createDraft, updateDraftField, deleteDraft, reorderDrafts } from "./actions";
import { Button } from "@/components/ui/Button";
import { ChevronDown, ChevronRight, GripVertical, Pencil } from "lucide-react";

export default function DraftsList({
  studentId,
  initialDrafts,
}: {
  studentId: string;
  initialDrafts: Draft[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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

  function handleDelete(id: string) {
    if (!window.confirm("Удалить черновик?")) return;
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    startTransition(() => deleteDraft(id));
  }

  function handleEditLink(id: string, current: string | null) {
    const url = window.prompt("Ссылка", current ?? "");
    if (url === null) return; // cancelled
    handleField(id, "link", url);
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
      {drafts.map((draft) => {
        const isCollapsed = collapsed[draft.id] ?? false;
        return (
          <div
            key={draft.id}
            draggable
            onDragStart={() => handleDragStart(draft.id)}
            onDragOver={(e) => handleDragOver(e, draft.id)}
            onDrop={handleDrop}
            className="rounded-[14px] mb-3 max-w-[680px] overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            {/* Header — always visible */}
            <div
              className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
              style={{ background: isCollapsed ? "transparent" : "var(--bg-surface-2)" }}
              onClick={() => toggleCollapsed(draft.id)}
            >
              <GripVertical
                size={14}
                className="shrink-0 cursor-grab active:cursor-grabbing"
                style={{ color: "var(--ink-faint)" }}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="flex-1 min-w-0 text-[14px] font-semibold truncate" style={{ color: "var(--ink)" }}>
                {draft.title || "Без названия"}
              </span>
              {isCollapsed
                ? <ChevronRight size={15} style={{ color: "var(--ink-faint)" }} />
                : <ChevronDown size={15} style={{ color: "var(--ink-faint)" }} />
              }
            </div>

            {/* Body */}
            {!isCollapsed && (
              <div className="px-4 pb-4 pt-2">
                <input
                  defaultValue={draft.title}
                  onBlur={(e) => handleField(draft.id, "title", e.target.value)}
                  onKeyDown={blurOnEnter}
                  placeholder="Название"
                  className="heading w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-2"
                  style={{ borderColor: "var(--border)" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <input
                  defaultValue={draft.note ?? ""}
                  onBlur={(e) => handleField(draft.id, "note", e.target.value)}
                  onKeyDown={blurOnEnter}
                  placeholder="примечание"
                  className="w-full outline-none bg-transparent text-[13px] italic mb-3"
                  style={{ color: "var(--ink-soft)" }}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Link */}
                  {draft.link ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={draft.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12.5px] underline-offset-2 underline"
                        style={{ color: "var(--accent)" }}
                      >
                        {shortenUrl(draft.link)}
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditLink(draft.id, draft.link); }}
                        title="Изменить ссылку"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={(e) => { e.stopPropagation(); handleEditLink(draft.id, null); }}
                      variant="dashed-sage"
                      size="sm"
                      pill
                    >
                      + ссылка
                    </Button>
                  )}

                  {/* File */}
                  {draft.fileData ? (
                    <a
                      href={draft.fileData}
                      download={draft.fileName ?? "файл"}
                      className="text-[13px] px-4 py-1.5 rounded-full inline-block"
                      style={{ color: "var(--sage)", border: "1px solid var(--sage)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {draft.fileName ?? "скачать"}
                    </a>
                  ) : (
                    <FileAttachBox fileName={null} onUpload={(file) => handleFile(draft.id, file)} />
                  )}

                  <Button onClick={() => handleDelete(draft.id)} variant="secondary" size="sm" pill className="ml-auto">
                    удалить
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <Button onClick={handleAdd} variant="dashed" size="sm" pill>
        + черновик
      </Button>
    </div>
  );
}
