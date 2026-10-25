"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { WorkPlan, WorkPlanStatus } from "@/generated/prisma/client";
import EditableWithLinks from "@/components/EditableWithLinks";
import PageHeader from "@/components/PageHeader";
import { createWorkPlan, deleteWorkPlan, updateWorkPlanField, cycleWorkPlanStatus } from "./actions";
import EmptyState from "@/components/EmptyState";

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

const TABS: { id: string; label: string; status: WorkPlanStatus | null; bg: string; color: string }[] = [
  { id: "progress", label: "В процессе", status: "IN_PROGRESS", bg: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)" },
  { id: "planned", label: "Запланировано", status: "PLANNED", bg: "var(--soft)", color: "var(--ink)" },
  { id: "all", label: "Все задачи", status: null, bg: "var(--deep)", color: "#fff" },
];

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

function PeriodRow({
  plan,
  onField,
  onStatus,
  onDelete,
}: {
  plan: WorkPlan;
  onField: (field: "monthStart" | "monthEnd" | "description" | "literature" | "note", value: string) => void;
  onStatus: () => void;
  onDelete: () => void;
}) {
  const range = formatMonthRange(plan.monthStart, plan.monthEnd);

  return (
    <tr>
      <td className="align-top" style={{ minWidth: 160 }}>
        <div className="text-[13px]">{range || "Период"}</div>
        <div className="mt-1">
          <MonthSelect value={plan.monthStart} onChange={(value) => onField("monthStart", value)} placeholder="Начало" />
        </div>
        <div className="mt-1">
          <MonthSelect value={plan.monthEnd} onChange={(value) => onField("monthEnd", value)} placeholder="Конец" />
        </div>
      </td>
      <td className="min-w-[180px]">
        <EditableWithLinks defaultValue={plan.description} onSave={(value) => onField("description", value)} placeholder="Что планируется..." className="reading w-full outline-none bg-transparent" />
      </td>
      <td className="min-w-[140px]">
        <EditableWithLinks defaultValue={plan.literature} onSave={(value) => onField("literature", value)} placeholder="что почитать..." className="w-full outline-none bg-transparent text-[13px]" />
      </td>
      <td className="min-w-[140px]">
        <EditableWithLinks defaultValue={plan.note} onSave={(value) => onField("note", value)} placeholder="примечание..." className="w-full outline-none bg-transparent text-[13px]" />
      </td>
      <td>
        <button onClick={onStatus} className="text-[12px] px-2.5 py-1.5 rounded-full whitespace-nowrap" style={STATUS_STYLE[plan.status]}>
          {STATUS_LABEL[plan.status]}
        </button>
      </td>
      <td>
        <button onClick={onDelete} style={{ color: "var(--muted)" }} title="Удалить период"><Trash2 size={15} /></button>
      </td>
    </tr>
  );
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === requested) ? requested! : "progress";

  function selectTab(id: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const tab = TABS.find((item) => item.id === activeTab) ?? TABS[0];
  const visible = plans.filter((plan) => tab.status == null || plan.status === tab.status);

  function handleAdd() {
    startTransition(async () => {
      const plan = await createWorkPlan(studentId);
      setPlans((prev) => [...prev, plan]);
    });
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить строку плана?"))) return;
    setPlans((prev) => prev.filter((p) => p.id !== id));
    startTransition(() => deleteWorkPlan(id));
  }

  function handleField(id: string, field: "monthStart" | "monthEnd" | "description" | "literature" | "note", value: string) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    startTransition(() => updateWorkPlanField(id, field, value));
  }

  function handleStatus(id: string) {
    const next: Record<WorkPlanStatus, WorkPlanStatus> = { PLANNED: "IN_PROGRESS", IN_PROGRESS: "DONE", DONE: "PLANNED" };
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, status: next[p.status] } : p)));
    startTransition(async () => { await cycleWorkPlanStatus(id); });
  }

  return (
    <div>
      <PageHeader
        title="План работы"
        actions={
          <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Добавить период
          </button>
        }
      />

      <div className="status-cards" role="tablist" aria-label="Фильтр плана работы">
        {TABS.map((item) => {
          const count = item.status == null ? plans.length : plans.filter((plan) => plan.status === item.status).length;
          const on = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => selectTab(item.id)}
              className={`status-card hover-lift${on ? " is-on" : ""}`}
              data-tone={item.id}
              style={{ background: item.bg, color: item.color }}
            >
              <div className="status-card-num">{count}</div>
              <div className="status-card-lbl">{item.label}</div>
            </button>
          );
        })}
      </div>

      {plans.length === 0 ? (
        <EmptyState
          cue="Самое время наметить путь"
          detail="Периоды, литература и заметки к работе."
          action={
            <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
              <Plus size={16} /> Добавить период
            </button>
          }
        />
      ) : (
      <div className="sheet px-3 pt-2 pb-1" key={activeTab}>
        <table>
          <thead>
            <tr>
              <th>Период</th>
              <th>Описание</th>
              <th>Литература</th>
              <th>Примечание</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  В этой вкладке задач нет.
                </td>
              </tr>
            )}
            {visible.map((plan) => (
              <PeriodRow
                key={plan.id}
                plan={plan}
                onField={(field, value) => handleField(plan.id, field, value)}
                onStatus={() => handleStatus(plan.id)}
                onDelete={() => handleDelete(plan.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
