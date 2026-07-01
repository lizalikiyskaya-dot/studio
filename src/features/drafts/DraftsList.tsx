"use client";

import { useState, useTransition } from "react";
import type { Draft } from "@/generated/prisma/client";
import FileAttachBox from "@/components/FileAttachBox";
import { uploadFile } from "@/lib/uploadFile";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { shortenUrl } from "@/lib/shortenUrl";
import { createDraft, updateDraftField, deleteDraft } from "./actions";
import { Button } from "@/components/ui/Button";

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

  function handleFile(id: string, file: File) {
    startTransition(async () => {
      const { fileName } = await uploadFile("draft", id, "file", file);
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, fileName } : d)));
    });
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
            onKeyDown={blurOnEnter}
            placeholder="Название"
            className="heading w-full outline-none bg-transparent text-[15px] font-semibold border-b pb-1 mb-2"
            style={{ borderColor: "var(--rule)" }}
          />
          <input
            defaultValue={draft.note}
            onBlur={(e) => handleField(draft.id, "note", e.target.value)}
            onKeyDown={blurOnEnter}
            placeholder="примечание"
            className="w-full outline-none bg-transparent text-[13px] italic mb-3"
            style={{ color: "var(--ink-soft)" }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            {draft.link ? (
              <a href={draft.link} target="_blank" rel="noopener noreferrer" title={draft.link} className="text-[12.5px]" style={{ color: "var(--wine)" }}>
                {shortenUrl(draft.link)}
              </a>
            ) : (
              <Button
                onClick={() => {
                  const url = window.prompt("Ссылка");
                  if (url) handleField(draft.id, "link", url);
                }}
                variant="dashed-sage"
                size="sm"
                pill
              >
                + ссылка
              </Button>
            )}
            <FileAttachBox fileName={draft.fileName} onUpload={(file) => handleFile(draft.id, file)} />
            <Button onClick={() => handleDelete(draft.id)} variant="secondary" size="sm" pill className="ml-auto">
              удалить
            </Button>
          </div>
        </div>
      ))}

      <Button onClick={handleAdd} variant="dashed" size="sm" pill>
        + черновик
      </Button>
    </div>
  );
}
