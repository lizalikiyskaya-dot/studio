"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import type { OpenCall } from "@/generated/prisma/client";
import ChoiceMenu from "@/components/ChoiceMenu";
import SiteDateField from "@/components/SiteDateField";
import { siteConfirm } from "@/components/SiteDialog";
import { EntryLink, EntryNote, EntryTitle } from "@/features/entries/EntryParts";
import { SUBMISSION_STATUS_LABEL, SUBMISSION_STATUS_STYLE } from "@/features/submissions/status";
import { createOpenCall, deleteOpenCall, setOpenCallSent, updateOpenCallField } from "./actions";
import EmptyState from "@/components/EmptyState";

const SENT_CHOICES = [
  { id: "no" as const, label: SUBMISSION_STATUS_LABEL.NOT_SENT, style: SUBMISSION_STATUS_STYLE.NOT_SENT },
  { id: "yes" as const, label: SUBMISSION_STATUS_LABEL.SENT, style: SUBMISSION_STATUS_STYLE.SENT },
];

export default function OpenCallsTable({
  studentId,
  initial,
}: {
  studentId: string;
  initial: OpenCall[];
}) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const row = await createOpenCall(studentId);
      setRows((prev) => [...prev, row]);
    });
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить опен-колл?"))) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
    startTransition(() => deleteOpenCall(id));
  }

  function handleField(id: string, field: "target" | "deadline" | "note" | "link", value: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    startTransition(() => updateOpenCallField(id, field, value));
  }

  function handleSent(id: string, sent: boolean) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, sent } : row)));
    startTransition(() => {
      void setOpenCallSent(id, sent);
    });
  }

  return (
    <div>
      <PageHeader
        title="Опен-коллы"
        actions={
          <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Добавить опен-колл
          </button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          cue="Самое время отправить текст"
          detail="Журналы, антологии и конкурсы, куда можно подать работу."
          action={
            <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
              <Plus size={16} /> Добавить опен-колл
            </button>
          }
        />
      ) : (
        <div className="entry-list">
          {rows.map((row) => (
            <article key={row.id} className="entry-card">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <EntryTitle
                    value={row.target}
                    placeholder="журнал, антология, конкурс"
                    onSave={(value) => handleField(row.id, "target", value)}
                  />
                </div>
                <ChoiceMenu
                  value={row.sent ? "yes" : "no"}
                  choices={SENT_CHOICES}
                  menuLabel="Статус опен-колла"
                  onChange={(value) => handleSent(row.id, value === "yes")}
                />
                <button type="button" className="entry-delete" aria-label="Удалить опен-колл" onClick={() => handleDelete(row.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-3">
                <SiteDateField value={row.deadline} onChange={(value) => handleField(row.id, "deadline", value)} />
              </div>
              <EntryNote value={row.note} onSave={(value) => handleField(row.id, "note", value)} />
              <div className="mt-3">
                <EntryLink value={row.link} onSave={(value) => handleField(row.id, "link", value)} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
