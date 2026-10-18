"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { Submission, SubmissionType, SubmissionStatus } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import EditableWithLinks from "@/components/EditableWithLinks";
import LinkCell from "@/components/LinkCell";
import DateField from "@/components/DateField";
import { createSubmission, deleteSubmission, updateSubmissionField, cycleSubmissionStatus } from "./actions";

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  WAITING: "ждём ответа",
  ACCEPTED: "принято",
  REJECTED: "отклонено",
};

const STATUS_STYLE: Record<SubmissionStatus, React.CSSProperties> = {
  WAITING: { background: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)", border: "none" },
  ACCEPTED: { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)", border: "none" },
  REJECTED: { background: "var(--pill-red-bg)", color: "var(--pill-red-fg)", border: "none" },
};

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

  const targetLabel = type === "CONTEST" ? "Название конкурса" : "Издательство";

  function handleAdd() {
    startTransition(async () => {
      const row = await createSubmission(studentId, type);
      setRows((prev) => [...prev, row]);
    });
  }

  useEffect(() => {
    registerAdd?.(handleAdd);
  });

  function handleDelete(id: string) {
    if (!window.confirm("Удалить заявку?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => deleteSubmission(id));
  }

  function handleField(id: string, field: "target" | "work" | "date" | "note" | "link", value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    startTransition(() => updateSubmissionField(id, field, value));
  }

  function handleStatus(id: string) {
    const next: Record<SubmissionStatus, SubmissionStatus> = { WAITING: "ACCEPTED", ACCEPTED: "REJECTED", REJECTED: "WAITING" };
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: next[r.status] } : r)));
    startTransition(async () => { await cycleSubmissionStatus(id); });
  }

  return (
    <div className="sheet px-3 pt-2 pb-1">
      <table>
        <thead>
          <tr>
            <th>{targetLabel}</th>
            <th>Произведение</th>
            <th>Дата подачи</th>
            <th>Статус</th>
            <th>Примечание</th>
            <th>Ссылка</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} style={{ color: "var(--muted)" }}>Пока нет заявок.</td></tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="min-w-[160px]">
                <AutoGrowTextarea defaultValue={row.target} onBlur={(v) => handleField(row.id, "target", v)} placeholder={type === "CONTEST" ? "название конкурса" : "название издательства"} className="w-full outline-none bg-transparent text-[14px] font-semibold" />
              </td>
              <td className="min-w-[140px]">
                <AutoGrowTextarea defaultValue={row.work} onBlur={(v) => handleField(row.id, "work", v)} placeholder="что отправлено" className="w-full outline-none bg-transparent text-[14px]" />
              </td>
              <td><DateField value={row.date} onChange={(v) => handleField(row.id, "date", v)} /></td>
              <td>
                <button onClick={() => handleStatus(row.id)} className="text-[12px] px-2.5 py-1.5 rounded-full whitespace-nowrap" style={STATUS_STYLE[row.status]}>
                  {STATUS_LABEL[row.status]}
                </button>
              </td>
              <td className="min-w-[120px]">
                <EditableWithLinks defaultValue={row.note} onSave={(v) => handleField(row.id, "note", v)} placeholder="примечание..." className="w-full outline-none bg-transparent text-[13px]" />
              </td>
              <td><LinkCell value={row.link} onSave={(v) => handleField(row.id, "link", v)} /></td>
              <td>
                <button onClick={() => handleDelete(row.id)} style={{ color: "var(--muted)" }} title="Удалить заявку"><Trash2 size={15} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
