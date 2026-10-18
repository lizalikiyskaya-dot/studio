"use client";

import { useState, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import type { OpenCall } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import EditableWithLinks from "@/components/EditableWithLinks";
import LinkCell from "@/components/LinkCell";
import DateField from "@/components/DateField";
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

  return (
    <div>
      <PageHeader
        title="Опен-коллы"
        description="Журналы, антологии и конкурсы, куда можно подать текст."
        actions={
          <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Добавить опен-колл
          </button>
        }
      />
      <div className="sheet px-3 pt-2 pb-1">
        <table>
          <thead>
            <tr>
              <th>Куда</th>
              <th>Дедлайн</th>
              <th>Примечание</th>
              <th>Ссылка</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--muted)" }}>Пока нет опен-коллов.</td></tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="min-w-[180px]">
                  <AutoGrowTextarea defaultValue={row.target} onBlur={(v) => handleField(row.id, "target", v)} placeholder="журнал, антология, конкурс" className="w-full outline-none bg-transparent text-[14px] font-semibold" />
                </td>
                <td><DateField value={row.deadline} onChange={(v) => handleField(row.id, "deadline", v)} /></td>
                <td className="min-w-[140px]">
                  <EditableWithLinks defaultValue={row.note} onSave={(v) => handleField(row.id, "note", v)} placeholder="примечание..." className="w-full outline-none bg-transparent text-[13px]" />
                </td>
                <td><LinkCell value={row.link} onSave={(v) => handleField(row.id, "link", v)} /></td>
                <td>
                  <button
                    onClick={() => handleSent(row.id)}
                    className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1.5 rounded-full whitespace-nowrap"
                    style={row.sent ? { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" } : { background: "var(--soft)", color: "var(--ink2)" }}
                  >
                    {row.sent && <Check size={12} />}
                    {row.sent ? "отправлено" : "не отправлено"}
                  </button>
                </td>
                <td>
                  <button onClick={() => handleDelete(row.id)} style={{ color: "var(--muted)" }} title="Удалить"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
