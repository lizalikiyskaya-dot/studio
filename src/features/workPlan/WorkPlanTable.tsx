"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import type { WorkPlan, WorkPlanStatus } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { Button } from "@/components/ui/Button";
import { createWorkPlan, deleteWorkPlan, updateWorkPlanField, cycleWorkPlanStatus } from "./actions";

const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

const STATUS_LABEL: Record<WorkPlanStatus, string> = {
  PLANNED: "запланировано",
  IN_PROGRESS: "в процессе",
  DONE: "выполнено",
};

const STATUS_STYLE: Record<WorkPlanStatus, React.CSSProperties> = {
  PLANNED: { background: "var(--bg-surface-2)", color: "var(--faded)", border: "1px dashed var(--rule)" },
  IN_PROGRESS: { background: "#E2E9EE", color: "#3F6080", border: "none" },
  DONE: { background: "var(--ink)", color: "#fff", border: "none" },
};

function monthOptions() {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let delta = -3; delta <= 18; delta++) {
    const d = new Date(now.getFullYear(), now.getMonth() + delta, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${MONTHS_RU[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

const OPTIONS = monthOptions();

function MonthSelect({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[12.5px] outline-none bg-transparent"
      style={{ color: value ? "var(--ink)" : "var(--faded)", border: "none", cursor: "pointer" }}
    >
      <option value="">{placeholder}</option>
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function formatMonthRange(start: string, end: string): string {
  const fmt = (m: string) => {
    if (!m) return "";
    const [y, mo] = m.split("-");
    return `${MONTHS_RU[parseInt(mo) - 1]} ${y}`;
  };
  if (!start) return "";
  if (!end || end === start) return fmt(start);
  const [sy] = start.split("-");
  const [ey] = end.split("-");
  const sm = MONTHS_RU[parseInt(start.split("-")[1]) - 1];
  const em = MONTHS_RU[parseInt(end.split("-")[1]) - 1];
  if (sy === ey) return `${sm} — ${em} ${sy}`;
  return `${fmt(start)} — ${fmt(end)}`;
}

export default function WorkPlanTable({
  studentId,
  initialPlans,
}: {
  studentId: string;
  initialPlans: WorkPlan[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const plan = await createWorkPlan(studentId);
      setPlans((prev) => [...prev, plan]);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить строку плана?")) return;
    setPlans((prev) => prev.filter((p) => p.id !== id));
    startTransition(() => deleteWorkPlan(id));
  }

  function handleField(id: string, field: "monthStart" | "monthEnd" | "description" | "note", value: string) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    startTransition(() => updateWorkPlanField(id, field, value));
  }

  function handleStatus(id: string) {
    const current = plans.find((p) => p.id === id)!.status;
    const next: Record<WorkPlanStatus, WorkPlanStatus> = { PLANNED: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "PLANNED" };
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, status: next[p.status] } : p)));
    startTransition(async () => { await cycleWorkPlanStatus(id); });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-[14px] px-5 py-4"
            style={{ border: "1px solid var(--rule)", background: "var(--paper-light)" }}
          >
            <div className="flex items-start gap-4">
              {/* Month column */}
              <div className="flex-shrink-0" style={{ minWidth: 200 }}>
                <div className="text-[9px] font-mono-label uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
                  период
                </div>
                <div className="flex flex-col gap-1">
                  <MonthSelect
                    value={plan.monthStart}
                    onChange={(v) => handleField(plan.id, "monthStart", v)}
                    placeholder="Начало"
                  />
                  <MonthSelect
                    value={plan.monthEnd}
                    onChange={(v) => handleField(plan.id, "monthEnd", v)}
                    placeholder="Конец (до 2 мес.)"
                  />
                  {plan.monthStart && (
                    <div className="text-[11px] mt-0.5 font-semibold" style={{ color: "var(--ink-soft)" }}>
                      {formatMonthRange(plan.monthStart, plan.monthEnd)}
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

              {/* Description */}
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-mono-label uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
                  описание
                </div>
                <AutoGrowTextarea
                  defaultValue={plan.description}
                  onBlur={(v) => handleField(plan.id, "description", v)}
                  placeholder="Что планируется на этот период..."
                  className="w-full outline-none bg-transparent text-[13.5px] leading-snug"
                />
              </div>

              {/* Divider */}
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)", flexShrink: 0 }} />

              {/* Note */}
              <div style={{ minWidth: 160, maxWidth: 220 }}>
                <div className="text-[9px] font-mono-label uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
                  примечание
                </div>
                <AutoGrowTextarea
                  defaultValue={plan.note}
                  onBlur={(v) => handleField(plan.id, "note", v)}
                  placeholder="примечание..."
                  className="w-full outline-none bg-transparent text-[13px] leading-snug"
                  style={{ color: "var(--ink-soft)" }}
                />
              </div>

              {/* Status + delete */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <button onClick={() => handleDelete(plan.id)} style={{ color: "var(--faded)" }}>
                  <X size={14} />
                </button>
                <button
                  onClick={() => handleStatus(plan.id)}
                  className="text-[11.5px] px-3 py-1.5 rounded-full whitespace-nowrap"
                  style={STATUS_STYLE[plan.status]}
                >
                  {STATUS_LABEL[plan.status]}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleAdd} variant="dashed" size="sm" pill>
        + период
      </Button>
    </div>
  );
}
