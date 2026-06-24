"use client";

import { useState, useTransition } from "react";
import type { Draft } from "@/generated/prisma/client";
import FileAttachBox from "@/components/FileAttachBox";
import { createDraft, updateDraftField, updateDraftFile, deleteDraft } from "./actions";

export default function DraftsList({
  studentId,
  initialDrafts,
}: {
  studentId: string;
  initialDrafts: Draft[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [, startTransition] = useTransition();

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

  function handleFile(id: string, fileName: string, fileData: string) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, fileName } : d)));
    startTransition(() => updateDraftFile(id, fileName, fileData));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить черновик?")) return;
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    startTransition(() => deleteDraft(id));
  }

  return (
    <div>
      {drafts.map((draft) => (
        <div key={draft.id} className="rounded-md p-4 mb-4 max-w-[680px]" style={{ border: "1px solid var(--rule)" }}>
          <input
            defaultValue={draft.title}
            onBlur={(e) => handleField(draft.id, "title", e.target.value)}
            placeholder="Название"
            className="heading w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-2"
            style={{ borderColor: "var(--rule)" }}
          />
          <input
            defaultValue={draft.note}
            onBlur={(e) => handleField(draft.id, "note", e.target.value)}
            placeholder="примечание"
            className="w-full outline-none bg-transparent text-[13px] italic mb-3"
            style={{ color: "var(--ink-soft)" }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {draft.link ? (
              <a href={draft.link} target="_blank" rel="noopener noreferrer" className="text-[12.5px] break-all" style={{ color: "var(--wine)" }}>
                {draft.link}
              </a>
            ) : (
              <button
                onClick={() => {
                  const url = window.prompt("Ссылка");
                  if (url) handleField(draft.id, "link", url);
                }}
                className="text-[12.5px] px-2.5 py-1 rounded-sm"
                style={{ color: "var(--sage)", border: "1px solid var(--sage)" }}
              >
                + ссылка
              </button>
            )}
            <FileAttachBox fileName={draft.fileName} onUpload={(fileName, dataUrl) => handleFile(draft.id, fileName, dataUrl)} />
            <button
              onClick={() => handleDelete(draft.id)}
              className="text-[12.5px] px-2.5 py-1 rounded-sm ml-auto"
              style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
            >
              Удалить
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="text-[12.5px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + черновик
      </button>
    </div>
  );
}
