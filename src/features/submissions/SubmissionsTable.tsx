"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { Submission, SubmissionType, SubmissionStatus } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import LinkCell from "@/components/LinkCell";
import { Button } from "@/components/ui/Button";
import { createSubmission, deleteSubmission, updateSubmissionField, cycleSubmissionStatus } from "./actions";

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  WAITING: "ждём ответа",
  ACCEPTED: "принято",
  REJECTED: "отклонено",
};

const STATUS_STYLE: Record<SubmissionStatus, React.CSSProperties> = {
  WAITING: { background: "var(--bg-surface-2)", color: "var(--faded)", border: "1px dashed var(--rule)" },
  ACCEPTED: { background: "var(--sage-soft)", color: "var(--sage)", border: "none" },
  REJECTED: { background: "var(--accent-soft)", color: "var(--accent)", border: "none" },
};

export default function SubmissionsTable({
  studentId,
  type,
  initial,
}: {
  studentId: string;
  type: SubmissionType;
  initial: Submission[];
}) {
  const [rows, setRows] = useState(initial);
  const [, startTransition] = useTransition();

  const targetLabel = type === "CONTEST" ? "Конкурс" : "Издательство";

  function handleAdd() {
    startTransition(async () => {
      const row = await createSubmission(studentId, type);
      setRows((prev) => [...prev, row]);
    });
  }

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

  const labelCls = "text-[9px] font-mono-label uppercase tracking-wide mb-1.5";

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        {rows.length === 0 && (
          <p className="text-[13px]" style={{ color: "var(--faded)" }}>Пока нет заявок.</p>
        )}
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-[14px] px-5 py-4"
            style={{ border: "1px solid var(--rule)", background: "var(--paper-light)" }}
          >
            <div className="flex items-start gap-4">
              {/* target */}
              <div className="flex-shrink-0" style={{ minWidth: 180, maxWidth: 220 }}>
                <div className={labelCls} style={{ color: "var(--faded)" }}>{targetLabel}</div>
                <AutoGrowTextarea
                  defaultValue={row.target}
                  onBlur={(v) => handleField(row.id, "target", v)}
                  placeholder={type === "CONTEST" ? "название конкурса" : "название издательства"}
                  className="w-full outline-none bg-transparent text-[13.5px] leading-snug font-semibold"
                />
              </div>

              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

              {/* work */}
              <div className="flex-1 min-w-0">
                <div className={labelCls} style={{ color: "var(--faded)" }}>Произведение</div>
                <AutoGrowTextarea
                  defaultValue={row.work}
                  onBlur={(v) => handleField(row.id, "work", v)}
                  placeholder="что отправлено"
                  className="w-full outline-none bg-transparent text-[13.5px] leading-snug"
                />
              </div>

              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

              {/* date */}
              <div className="flex-shrink-0" style={{ width: 128 }}>
                <div className={labelCls} style={{ color: "var(--faded)" }}>Дата подачи</div>
                <input
                  type="date"
                  defaultValue={row.date}
                  onChange={(e) => handleField(row.id, "date", e.target.value)}
                  className="w-full outline-none bg-transparent text-[13px] font-mono-label"
                  style={{ color: row.date ? "var(--ink)" : "var(--faded)" }}
                />
              </div>

              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

              {/* note */}
              <div style={{ minWidth: 130, maxWidth: 180 }}>
                <div className={labelCls} style={{ color: "var(--faded)" }}>Примечание</div>
                <AutoGrowTextarea
                  defaultValue={row.note}
                  onBlur={(v) => handleField(row.id, "note", v)}
                  placeholder="примечание..."
                  className="w-full outline-none bg-transparent text-[13px] leading-snug"
                  style={{ color: "var(--ink-soft)" }}
                />
              </div>

              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

              {/* link */}
              <div className="flex-shrink-0" style={{ width: 130 }}>
                <div className={labelCls} style={{ color: "var(--faded)" }}>Ссылка</div>
                <LinkCell value={row.link} onSave={(v) => handleField(row.id, "link", v)} />
              </div>

              {/* status + delete */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <button onClick={() => handleDelete(row.id)} style={{ color: "var(--faded)" }}>
                  <X size={14} />
                </button>
                <button
                  onClick={() => handleStatus(row.id)}
                  className="text-[11.5px] px-3 py-1.5 rounded-full whitespace-nowrap"
                  style={STATUS_STYLE[row.status]}
                >
                  {STATUS_LABEL[row.status]}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleAdd} variant="dashed" size="sm" pill>
        + заявка
      </Button>
    </div>
  );
}
