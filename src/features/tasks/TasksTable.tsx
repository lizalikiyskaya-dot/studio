"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import type { Task, TaskStatus } from "@/generated/prisma/client";
import {
  createTask,
  updateTaskTitle,
  updateTaskLink,
  updateTaskDeadline,
  updateTaskNotes,
  cycleTaskStatus,
  deleteTask,
} from "./actions";
import { nextTaskStatus } from "./status";
import EditableWithLinks from "@/components/EditableWithLinks";
import DateField from "@/components/DateField";
const STATUS_LABEL: Record<TaskStatus, string> = {
  IN_PROGRESS: "в процессе",
  SUBMITTED: "сдано на проверку",
  NEEDS_REVISION: "на доработке",
  ACCEPTED: "принято",
};

const STATUS_STYLE: Record<TaskStatus, React.CSSProperties> = {
  IN_PROGRESS: { background: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)", border: "none" },
  SUBMITTED: { background: "var(--pill-vio-bg)", color: "var(--pill-vio-fg)", border: "none" },
  NEEDS_REVISION: { background: "var(--pill-or-bg)", color: "var(--pill-or-fg)", border: "none" },
  ACCEPTED: { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)", border: "none" },
};

function LinkCell({ value, onSave }: { value: string | null; onSave: (value: string) => void }) {
  function promptEdit() {
    const url = window.prompt("Ссылка", value ?? "");
    if (url !== null) onSave(url);
  }
  if (value) {
    let display: string;
    try {
      const u = new URL(value);
      display = u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
      if (display.length > 40) display = display.slice(0, 38) + "…";
    } catch {
      display = value.length > 40 ? value.slice(0, 38) + "…" : value;
    }
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <a href={value} target="_blank" rel="noopener noreferrer" title={value} className="lnk text-[12.5px] truncate">
          {display}
        </a>
        <button onClick={promptEdit} title="Изменить ссылку" style={{ color: "var(--faded)", flexShrink: 0 }}>
          <Pencil size={11} />
        </button>
      </div>
    );
  }
  return (
    <button onClick={promptEdit} className="lnk text-[12px]">
      + ссылка
    </button>
  );
}

const TABS: { id: string; label: string; status: TaskStatus | null; bg: string; color: string }[] = [
  { id: "progress", label: "В процессе", status: "IN_PROGRESS", bg: "var(--pill-blue-bg)", color: "var(--pill-blue-fg)" },
  { id: "submitted", label: "Сдано на проверку", status: "SUBMITTED", bg: "var(--pill-vio-bg)", color: "var(--pill-vio-fg)" },
  { id: "revision", label: "На доработке", status: "NEEDS_REVISION", bg: "var(--pill-or-bg)", color: "var(--pill-or-fg)" },
  { id: "accepted", label: "Принято", status: "ACCEPTED", bg: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" },
  { id: "all", label: "Все задания", status: null, bg: "var(--deep)", color: "#fff" },
];

function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export default function TasksTable({
  studentId,
  initialTasks,
  banners,
}: {
  studentId: string;
  initialTasks: Task[];
  banners?: React.ReactNode;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const requested = searchParams.get("tab");
  const activeTab = TABS.some((tab) => tab.id === requested) ? requested! : "progress";

  function handleAdd() {
    startTransition(async () => {
      const task = await createTask(studentId);
      setTasks((prev) => [...prev, task]);
    });
  }

  function handleTitleBlur(taskId: string, value: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: value } : t)));
    startTransition(() => updateTaskTitle(taskId, value));
  }

  function handleLink(taskId: string, field: "workLink" | "feedbackLink", value: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)));
    startTransition(() => updateTaskLink(taskId, field, value));
  }

  function handleDeadline(taskId: string, value: string) {
    const deadline = value ? new Date(value) : null;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, deadline } : t)));
    startTransition(() => updateTaskDeadline(taskId, value || null));
  }

  function handleNotes(taskId: string, value: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, notes: value } : t)));
    startTransition(() => updateTaskNotes(taskId, value));
  }

  function handleStatus(taskId: string, current: TaskStatus) {
    const next = nextTaskStatus(current);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: next } : t)));
    startTransition(() => {
      cycleTaskStatus(taskId);
    });
  }

  function handleDelete(taskId: string) {
    if (!window.confirm("Удалить задание?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(() => deleteTask(taskId));
  }

  function selectTab(id: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const visible = tasks.filter((task) => {
    const tab = TABS.find((item) => item.id === activeTab) ?? TABS[0];
    return tab.status == null || task.status === tab.status;
  });

  return (
    <div>
      <PageHeader
        title="Задания"
        actions={
          <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Добавить задание
          </button>
        }
      />

      <div className="flex gap-3 mb-5 flex-wrap" role="tablist" aria-label="Фильтр заданий">
        {TABS.map((tab) => {
          const count = tab.status == null ? tasks.length : tasks.filter((task) => task.status === tab.status).length;
          const on = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => selectTab(tab.id)}
              className={`hover-lift rounded-[18px] px-4 py-3 flex-1 min-w-[120px] text-left${on ? " is-on" : ""}`}
              style={{
                background: tab.bg,
                color: tab.color,
                opacity: on ? 1 : 0.72,
              }}
            >
              <div className="text-[24px] font-semibold leading-none">{count}</div>
              <div className="text-[12.5px] mt-1.5 opacity-80">{tab.label}</div>
            </button>
          );
        })}
      </div>

      <div className="sheet px-3 pt-2 pb-1">
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Описание задания</th>
              <th>Дедлайн</th>
              <th>Работа</th>
              <th>Отзыв</th>
              <th>Примечание</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "var(--muted)" }}>
                  {tasks.length === 0 ? "Заданий пока нет." : "В этой вкладке заданий нет."}
                </td>
              </tr>
            )}
            {visible.map((task, index) => (
              <tr key={task.id}>
                <td className="whitespace-nowrap tabular-nums" style={{ color: "var(--muted)" }}>{String(index + 1).padStart(2, "0")}</td>
                <td className="min-w-[180px]">
                  <EditableWithLinks
                    defaultValue={task.title}
                    onSave={(v) => handleTitleBlur(task.id, v)}
                    placeholder="Описание задания"
                    className="entry-title w-full min-w-0 outline-none bg-transparent text-[15px] leading-snug"
                  />
                </td>
                <td>
                  <DateField
                    value={toDateInputValue(task.deadline)}
                    onChange={(v) => handleDeadline(task.id, v)}
                  />
                </td>
                <td><LinkCell value={task.workLink} onSave={(v) => handleLink(task.id, "workLink", v)} /></td>
                <td><LinkCell value={task.feedbackLink} onSave={(v) => handleLink(task.id, "feedbackLink", v)} /></td>
                <td className="min-w-[140px]">
                  {task.notes || expandedNotes.has(task.id) ? (
                    <EditableWithLinks
                      defaultValue={task.notes}
                      onSave={(v) => handleNotes(task.id, v)}
                      placeholder="примечание..."
                      className="w-full outline-none bg-transparent text-[13px]"
                    />
                  ) : (
                    <button type="button" className="text-[13px]" style={{ color: "var(--muted)" }} onClick={() => setExpandedNotes((prev) => new Set(prev).add(task.id))}>
                      + примечание
                    </button>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => handleStatus(task.id, task.status)}
                    className="text-[12px] px-2.5 py-1.5 rounded-full whitespace-nowrap"
                    style={STATUS_STYLE[task.status]}
                  >
                    {STATUS_LABEL[task.status]}
                  </button>
                </td>
                <td>
                  <button onClick={() => handleDelete(task.id)} style={{ color: "var(--muted)" }} title="Удалить задание">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {banners}
    </div>
  );
}
