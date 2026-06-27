"use client";

import { useState, useTransition } from "react";
import { X, Bookmark, Check, Clock, RotateCcw } from "lucide-react";
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
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { shortenUrl } from "@/lib/shortenUrl";
import { Button } from "@/components/ui/Button";
import { Kpi } from "@/components/ui/Card";

const GRID_COLUMNS = "1fr 100px 110px 110px 130px";

const STATUS_LABEL: Record<TaskStatus, string> = {
  IN_PROGRESS: "в процессе",
  SUBMITTED: "сдано на проверку",
  NEEDS_REVISION: "на доработке",
  ACCEPTED: "принято",
};

const STATUS_STYLE: Record<TaskStatus, React.CSSProperties> = {
  IN_PROGRESS: { background: "var(--bg-surface-2)", color: "var(--faded)", border: "1px dashed var(--rule)" },
  SUBMITTED: { background: "var(--sage-soft)", color: "var(--sage)", border: "none" },
  NEEDS_REVISION: { background: "var(--accent-soft)", color: "var(--wine)", border: "none" },
  ACCEPTED: { background: "var(--ink)", color: "#fff", border: "none" },
};

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono-label block text-[9px] uppercase mb-0.5" style={{ color: "var(--faded)" }}>
      {children}
    </span>
  );
}

function LinkCell({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (value: string) => void;
}) {
  if (value) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        title={value}
        className="text-[12.5px] block"
        style={{ color: "var(--wine)", overflowWrap: "anywhere" }}
      >
        {shortenUrl(value)}
      </a>
    );
  }
  return (
    <Button
      onClick={() => {
        const url = window.prompt("Ссылка");
        if (url) onSave(url);
      }}
      variant="success-outline"
      size="sm"
    >
      + ссылка
    </Button>
  );
}

function toDateInputValue(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export default function TasksTable({
  studentId,
  initialTasks,
}: {
  studentId: string;
  initialTasks: Task[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

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

  const accepted = tasks.filter((t) => t.status === "ACCEPTED").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const needsRevision = tasks.filter((t) => t.status === "NEEDS_REVISION").length;

  return (
    <div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <Kpi icon={Bookmark} iconBg="var(--accent-soft)" iconColor="var(--wine)" num={tasks.length} label="всего заданий" />
        <Kpi icon={Check} iconBg="var(--sage-soft)" iconColor="var(--sage)" num={accepted} label="принято" />
        <Kpi icon={Clock} iconBg="#E2E9EE" iconColor="#3F6080" num={inProgress} label="в процессе" />
        <Kpi icon={RotateCcw} iconBg="var(--accent-soft)" iconColor="var(--wine)" num={needsRevision} label="на доработке" />
      </div>

      <div className="flex flex-col gap-2.5 mb-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-[14px] px-4 py-3.5"
            style={{ border: "1px solid var(--border)", background: "var(--paper-light)" }}
          >
            <div className="grid gap-x-3.5 items-start" style={{ gridTemplateColumns: GRID_COLUMNS }}>
              <div className="min-w-0">
                <MetaLabel>задание</MetaLabel>
                <AutoGrowTextarea
                  defaultValue={task.title}
                  onBlur={(v) => handleTitleBlur(task.id, v)}
                  placeholder="Описание задания"
                  className="w-full min-w-0 outline-none bg-transparent text-[13.5px] leading-snug"
                />
              </div>
              <div>
                <MetaLabel>дедлайн</MetaLabel>
                <input
                  type="date"
                  defaultValue={toDateInputValue(task.deadline)}
                  onChange={(e) => handleDeadline(task.id, e.target.value)}
                  className="w-full outline-none bg-transparent text-[12.5px]"
                  style={{ border: "1px solid var(--rule)", borderRadius: 6, padding: "4px 6px" }}
                />
              </div>
              <div className="min-w-0">
                <MetaLabel>работа</MetaLabel>
                <LinkCell value={task.workLink} onSave={(v) => handleLink(task.id, "workLink", v)} />
              </div>
              <div className="min-w-0">
                <MetaLabel>отзыв</MetaLabel>
                <LinkCell value={task.feedbackLink} onSave={(v) => handleLink(task.id, "feedbackLink", v)} />
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => handleStatus(task.id, task.status)}
                  className="font-mono-label text-[10px] px-2.5 py-1.5 rounded-full whitespace-nowrap uppercase"
                  style={STATUS_STYLE[task.status]}
                >
                  {STATUS_LABEL[task.status]}
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  style={{ color: "var(--faded)" }}
                  title="Удалить задание"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {task.notes || expandedNotes.has(task.id) ? (
              <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--rule)" }}>
                <MetaLabel>примечание</MetaLabel>
                <AutoGrowTextarea
                  defaultValue={task.notes}
                  onBlur={(v) => handleNotes(task.id, v)}
                  placeholder="примечание..."
                  className="w-full min-w-0 outline-none bg-transparent text-[13px] leading-snug"
                  style={{ maxWidth: 560 }}
                />
              </div>
            ) : (
              <button
                onClick={() => setExpandedNotes((prev) => new Set(prev).add(task.id))}
                className="text-[11px] mt-2"
                style={{ color: "var(--faded)" }}
              >
                + примечание
              </button>
            )}
          </div>
        ))}
      </div>

      <Button onClick={handleAdd} variant="secondary" size="sm">
        + задание
      </Button>
    </div>
  );
}
