"use client";

import { siteConfirm, sitePrompt } from "@/components/SiteDialog";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import type { Task, TaskStatus } from "@/generated/prisma/client";
import {
  createTask,
  updateTaskTitle,
  updateTaskLink,
  updateTaskDeadline,
  updateTaskNotes,
  setTaskStatus,
  deleteTask,
  reorderTasks,
} from "./actions";
import { moveBy, moveWithin, taskRowNumber } from "./order";
import TaskStatusMenu from "./TaskStatusMenu";
import EditableWithLinks from "@/components/EditableWithLinks";
import DateField from "@/components/DateField";

function LinkCell({ value, onSave }: { value: string | null; onSave: (value: string) => void }) {
  async function promptEdit() {
    const url = await sitePrompt("Ссылка", value ?? "");
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
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const dragIdRef = useRef<string | null>(null);
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

  function handleStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    startTransition(() => {
      void setTaskStatus(taskId, status);
    });
  }

  async function handleDelete(taskId: string) {
    if (!(await siteConfirm("Удалить задание?"))) return;
    const next = tasksRef.current.filter((task) => task.id !== taskId);
    tasksRef.current = next;
    setTasks(next);
    startTransition(() => deleteTask(taskId));
  }

  function visibleOf(list: Task[]) {
    const tab = TABS.find((item) => item.id === activeTab) ?? TABS[0];
    return list.filter((task) => tab.status == null || task.status === tab.status);
  }

  function persist(next: Task[]) {
    const current = tasksRef.current;
    if (next.length === current.length && next.every((task, index) => task.id === current[index]?.id)) return;
    tasksRef.current = next;
    setTasks(next);
    startTransition(() => reorderTasks(studentId, next.map((task) => task.id)));
  }

  function move(id: string, dir: -1 | 1) {
    const current = tasksRef.current;
    const shown = visibleOf(current);
    persist(moveBy(current, shown.map((task) => task.id), id, dir));
  }

  function dropOn(targetId: string, fromId: string | null) {
    dragIdRef.current = null;
    if (!fromId || fromId === targetId) return;
    const current = tasksRef.current;
    const shown = visibleOf(current);
    persist(moveWithin(current, shown.map((task) => task.id), fromId, targetId));
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
      <div className="page-head">
        <div className="page-actions">
          <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Добавить задание
          </button>
        </div>
      </div>

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

      {tasks.length === 0 ? (
        <EmptyState
          cue="Самое время писать"
          detail="Здесь появятся задания, которые сдадите на проверку."
          action={
            <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
              <Plus size={16} /> Добавить задание
            </button>
          }
        />
      ) : (
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
                  В этой вкладке заданий нет.
                </td>
              </tr>
            )}
            {visible.map((task, index) => (
              <tr
                key={task.id}
                onDragOver={(event) => {
                  if (dragIdRef.current) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropOn(task.id, event.dataTransfer.getData("text/plain") || dragIdRef.current);
                }}
              >
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="task-move-handle"
                      draggable
                      aria-label="Перетащить"
                      title="Перетащить"
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", task.id);
                        dragIdRef.current = task.id;
                      }}
                      onDragEnd={() => {
                        dragIdRef.current = null;
                      }}
                    >
                      <GripVertical size={14} />
                    </span>
                    <span className="task-move-arrows">
                      <button type="button" className="task-move-btn" aria-label="Выше" title="Выше" disabled={index === 0} onClick={() => move(task.id, -1)}>
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" className="task-move-btn" aria-label="Ниже" title="Ниже" disabled={index === visible.length - 1} onClick={() => move(task.id, 1)}>
                        <ChevronDown size={14} />
                      </button>
                    </span>
                    <span className="tabular-nums" style={{ color: "var(--muted)" }}>{taskRowNumber(index)}</span>
                  </div>
                </td>
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
                  <TaskStatusMenu status={task.status} onChange={(status) => handleStatus(task.id, status)} />
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
      )}
      {banners}
    </div>
  );
}
