"use client";

import { useState, useTransition } from "react";
import type { Task, TaskStatus } from "@/generated/prisma/client";
import { createTask, updateTaskTitle, updateTaskLink, updateTaskDeadline, cycleTaskStatus, deleteTask } from "./actions";
import { nextTaskStatus } from "./status";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";

const GRID_COLUMNS = "2fr 150px 170px 170px 150px 30px";

const STATUS_LABEL: Record<TaskStatus, string> = {
  IN_PROGRESS: "в процессе",
  SUBMITTED: "сдано на проверку",
  NEEDS_REVISION: "на доработке",
  ACCEPTED: "принято",
};

const STATUS_STYLE: Record<TaskStatus, React.CSSProperties> = {
  IN_PROGRESS: { background: "#fff", color: "var(--faded)", border: "1px dashed var(--rule)" },
  SUBMITTED: { background: "#fff", color: "var(--sage)", border: "1px solid var(--sage)" },
  NEEDS_REVISION: { background: "#fff", color: "var(--wine)", border: "1px solid var(--wine)" },
  ACCEPTED: { background: "var(--ink)", color: "#fff", border: "1px solid var(--ink)" },
};

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
        className="text-[12.5px] break-all"
        style={{ color: "var(--wine)" }}
      >
        {value}
      </a>
    );
  }
  return (
    <button
      onClick={() => {
        const url = window.prompt("Ссылка");
        if (url) onSave(url);
      }}
      className="text-[12.5px] px-2.5 py-1 rounded-sm"
      style={{ color: "var(--sage)", border: "1px solid var(--sage)" }}
    >
      + ссылка
    </button>
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

  return (
    <div>
      <div className="overflow-x-auto mb-4">
        <div style={{ minWidth: 780 }}>
          <div
            className="grid gap-x-3 pb-2 border-b"
            style={{ gridTemplateColumns: GRID_COLUMNS, borderColor: "var(--rule)" }}
          >
            {["Задание", "Дедлайн", "Ссылка на работу", "Обратная связь", "Статус", ""].map((h) => (
              <div
                key={h}
                className="text-[12px] whitespace-nowrap"
                style={{ color: "var(--faded)" }}
              >
                {h}
              </div>
            ))}
          </div>

          {tasks.map((task) => (
            <div
              key={task.id}
              className="grid gap-x-3 py-2.5 border-b items-start"
              style={{ gridTemplateColumns: GRID_COLUMNS, borderColor: "var(--rule)" }}
            >
              <AutoGrowTextarea
                defaultValue={task.title}
                onBlur={(v) => handleTitleBlur(task.id, v)}
                placeholder="Описание задания"
                className="w-full min-w-0 outline-none bg-transparent text-[13.5px] py-1 leading-snug"
              />
              <input
                type="date"
                defaultValue={toDateInputValue(task.deadline)}
                onChange={(e) => handleDeadline(task.id, e.target.value)}
                className="w-full outline-none bg-transparent text-[12.5px] py-1.5"
                style={{ border: "1px solid var(--rule)", borderRadius: 2, padding: "4px 6px" }}
              />
              <div className="pt-1">
                <LinkCell value={task.workLink} onSave={(v) => handleLink(task.id, "workLink", v)} />
              </div>
              <div className="pt-1">
                <LinkCell value={task.feedbackLink} onSave={(v) => handleLink(task.id, "feedbackLink", v)} />
              </div>
              <div className="pt-1">
                <button
                  onClick={() => handleStatus(task.id, task.status)}
                  className="font-mono-label text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={STATUS_STYLE[task.status]}
                >
                  {STATUS_LABEL[task.status]}
                </button>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-[12px]"
                  style={{ color: "var(--wine)" }}
                  title="Удалить задание"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="text-[12.5px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + задание
      </button>
    </div>
  );
}
