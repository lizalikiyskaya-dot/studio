"use client";

import { useState, useTransition } from "react";
import { X, Check } from "lucide-react";
import type { OpenCall } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import EditableWithLinks from "@/components/EditableWithLinks";
import LinkCell from "@/components/LinkCell";
import DateField from "@/components/DateField";
import { Button } from "@/components/ui/Button";
import { createOpenCall, deleteOpenCall, updateOpenCallField, toggleOpenCallSent } from "./actions";

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

  function handleDelete(id: string) {
    if (!window.confirm("Удалить опен-колл?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => deleteOpenCall(id));
  }

  function handleField(id: string, field: "target" | "deadline" | "note" | "link", value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    startTransition(() => updateOpenCallField(id, field, value));
  }

  function handleSent(id: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, sent: !r.sent } : r)));
    startTransition(async () => { await toggleOpenCallSent(id); });
  }

  const labelCls = "text-[9px] font-mono-label uppercase tracking-wide mb-1.5";

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        {rows.length === 0 && (
          <p className="text-[13px]" style={{ color: "var(--faded)" }}>Пока нет опен-коллов.</p>
        )}
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-[14px] px-5 py-4"
            style={{ border: "1px solid var(--rule)", background: "var(--paper-light)" }}
          >
            <div className="flex items-start gap-4">
              {/* target */}
              <div className="flex-1 min-w-0">
                <div className={labelCls} style={{ color: "var(--faded)" }}>Куда</div>
                <AutoGrowTextarea
                  defaultValue={row.target}
                  onBlur={(v) => handleField(row.id, "target", v)}
                  placeholder="куда подавать (журнал, антология, конкурс...)"
                  className="w-full outline-none bg-transparent text-[13.5px] leading-snug font-semibold"
                />
              </div>

              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

              {/* deadline */}
              <div className="flex-shrink-0" style={{ width: 128 }}>
                <div className={labelCls} style={{ color: "var(--faded)" }}>Дедлайн</div>
                <DateField value={row.deadline} onChange={(v) => handleField(row.id, "deadline", v)} />
              </div>

              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

              {/* note */}
              <div style={{ minWidth: 140, maxWidth: 200 }}>
                <div className={labelCls} style={{ color: "var(--faded)" }}>Примечание</div>
                <EditableWithLinks
                  defaultValue={row.note}
                  onSave={(v) => handleField(row.id, "note", v)}
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

              {/* sent toggle + delete */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <button onClick={() => handleDelete(row.id)} style={{ color: "var(--faded)" }}>
                  <X size={14} />
                </button>
                <button
                  onClick={() => handleSent(row.id)}
                  className="flex items-center gap-1 text-[11.5px] px-3 py-1.5 rounded-full whitespace-nowrap"
                  style={
                    row.sent
                      ? { background: "var(--sage-soft)", color: "var(--sage)", border: "none" }
                      : { background: "var(--bg-surface-2)", color: "var(--faded)", border: "1px dashed var(--rule)" }
                  }
                >
                  {row.sent && <Check size={12} />}
                  {row.sent ? "отправлено" : "не отправлено"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleAdd} variant="dashed" size="sm" pill>
        + опен-колл
      </Button>
    </div>
  );
}
