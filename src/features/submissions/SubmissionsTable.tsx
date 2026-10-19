"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { Submission, SubmissionStatus, SubmissionType } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import ChoiceMenu from "@/components/ChoiceMenu";
import SiteDateField from "@/components/SiteDateField";
import { siteConfirm } from "@/components/SiteDialog";
import { EntryLink, EntryNote, EntryTitle } from "@/features/entries/EntryParts";
import EmptyState from "@/components/EmptyState";
import { createSubmission, deleteSubmission, setSubmissionStatus, updateSubmissionField } from "./actions";
import { SUBMISSION_STATUSES, SUBMISSION_STATUS_LABEL, SUBMISSION_STATUS_STYLE } from "./status";

const STATUS_CHOICES = SUBMISSION_STATUSES.map((id) => ({
  id,
  label: SUBMISSION_STATUS_LABEL[id],
  style: SUBMISSION_STATUS_STYLE[id],
}));

export default function SubmissionsTable({
  studentId,
  type,
  initial,
  registerAdd,
}: {
  studentId: string;
  type: SubmissionType;
  initial: Submission[];
  registerAdd?: (fn: () => void) => void;
}) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();
  const targetPlaceholder = type === "CONTEST" ? "название конкурса" : "название издательства";

  function handleAdd() {
    startTransition(async () => {
      const row = await createSubmission(studentId, type);
      setRows((prev) => [...prev, row]);
    });
  }

  useEffect(() => {
    registerAdd?.(handleAdd);
  });

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить заявку?"))) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
    startTransition(() => deleteSubmission(id));
  }

  function handleField(id: string, field: "target" | "work" | "date" | "note" | "link", value: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
    startTransition(() => updateSubmissionField(id, field, value));
  }

  function handleStatus(id: string, status: SubmissionStatus) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
    startTransition(() => {
      void setSubmissionStatus(id, status);
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        cue="Самое время отправить текст"
        detail={type === "CONTEST" ? "Конкурсы, куда ушла работа, и что ответили." : "Издательства, куда ушла рукопись, и что ответили."}
      />
    );
  }

  return (
    <div className="entry-list">
      {rows.map((row) => (
        <article key={row.id} className="entry-card">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <EntryTitle
                value={row.target}
                placeholder={targetPlaceholder}
                onSave={(value) => handleField(row.id, "target", value)}
              />
              <AutoGrowTextarea
                defaultValue={row.work}
                onBlur={(value) => handleField(row.id, "work", value)}
                placeholder="что отправлено"
                className="entry-work"
              />
            </div>
            <ChoiceMenu
              value={row.status}
              choices={STATUS_CHOICES}
              menuLabel="Статус заявки"
              onChange={(status) => handleStatus(row.id, status)}
            />
            <button type="button" className="entry-delete" aria-label="Удалить заявку" onClick={() => handleDelete(row.id)}>
              <Trash2 size={16} />
            </button>
          </div>
          <div className="mt-3">
            <SiteDateField value={row.date} onChange={(value) => handleField(row.id, "date", value)} />
          </div>
          <EntryNote value={row.note} onSave={(value) => handleField(row.id, "note", value)} />
          <div className="mt-3">
            <EntryLink value={row.link} onSave={(value) => handleField(row.id, "link", value)} />
          </div>
        </article>
      ))}
    </div>
  );
}
