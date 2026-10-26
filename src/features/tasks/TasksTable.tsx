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
import SubmitForReviewButton from "@/features/submit/SubmitForReviewButton";
import { submitReviewControl } from "@/features/submit/submitStar";
import { TASK_FILTERS } from "./status";
import EditableWithLinks from "@/components/EditableWithLinks";
import DateField from "@/components/DateField";

function linkLabel(value: string, limit = 40) {
  let display: string;
  try {
    const u = new URL(value);
    display = u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    display = value;
  }
  return display.length > limit ? display.slice(0, limit - 2) + "…" : display;
}

function LinkCell({ value, onSave, limit = 40 }: { value: string | null; onSave: (value: string) => void; limit?: number }) {
  async function promptEdit() {
    const url = await sitePrompt("Ссылка", value ?? "");
    if (url !== null) onSave(url);
  }
  if (value) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <a href={value} target="_blank" rel="noopener noreferrer" title={value} className="lnk text-[12.5px] truncate">
          {linkLabel(value, limit)}
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

/** Ученик открывает отзыв наставника и не меняет ссылку. */
function FeedbackReadOnly({ value }: { value: string | null }) {
  if (!value) return <span className="task-feedback-empty">пока нет</span>;
  return (
    <a href={value} target="_blank" rel="noopener noreferrer" title={value} className="lnk min-w-0 text-[12.5px] truncate">
      {linkLabel(value, 72)}
    </a>
  );
}

const TABS = TASK_FILTERS;

function noteIsLong(value: string) {
  const text = value.trim();
  return text.length > 110 || text.split(/\n/).length > 2;
}

function TaskNote({
  value,
  open,
  onToggle,
  onSave,
}: {
  value: string;
  open: boolean;
  onToggle: () => void;
  onSave: (value: string) => void;
}) {
  if (!value && !open) {
    return (
      <button type="button" className="task-note-more" onClick={onToggle}>
        + примечание
      </button>
    );
  }
  if (value && noteIsLong(value) && !open) {
    return (
      <div className="task-note-fold">
        <p className="task-note-clamp">{value}</p>
        <button type="button" className="task-note-more" onClick={onToggle}>
          Показать полностью
        </button>
      </div>
    );
  }
  return (
    <div className="task-note-fold">
      <EditableWithLinks
        defaultValue={value}
        onSave={onSave}
        placeholder="примечание..."
        className="task-note"
      />
      {noteIsLong(value) ? (
        <button type="button" className="task-note-more" onClick={onToggle}>
          Свернуть
        </button>
      ) : null}
    </div>
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
  isMentor,
  banners,
}: {
  studentId: string;
  initialTasks: Task[];
  isMentor: boolean;
  banners?: React.ReactNode;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [lingering, setLingering] = useState<Set<string>>(() => new Set());
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
    // На вкладке «В процессе» карточка остаётся, пока кнопка уже «Сдано на проверку» и звёздочка летит.
    if (status === "SUBMITTED" && activeTab === "progress") {
      setLingering((prev) => new Set(prev).add(taskId));
      window.setTimeout(() => {
        setLingering((prev) => {
          if (!prev.has(taskId)) return prev;
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }, 800);
    }
    startTransition(async () => {
      await setTaskStatus(taskId, status);
      router.refresh();
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
    return list.filter(
      (task) => tab.status == null || task.status === tab.status || (tab.id === "progress" && lingering.has(task.id)),
    );
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

  const visible = visibleOf(tasks);

  return (
    <div>
      <div className="page-head">
        <div className="page-actions">
          <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
            <Plus size={16} /> Добавить задание
          </button>
        </div>
      </div>

      <div className="status-cards" role="tablist" aria-label="Фильтр заданий">
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
              className={`status-card hover-lift${on ? " is-on" : ""}`}
              data-tone={tab.id}
              style={{ background: tab.bg, color: tab.color }}
            >
              <div className="status-card-num">{count}</div>
              <div className="status-card-lbl">{tab.label}</div>
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
      <div className="task-sheet" key={activeTab}>
        <div className="task-head" aria-hidden="true">
          <span>Задание</span>
          <span>Дедлайн</span>
          <span>Работа</span>
          <span>Статус</span>
        </div>
        {visible.length === 0 ? (
          <p className="task-empty">В этой вкладке заданий нет.</p>
        ) : (
          visible.map((task, index) => (
            <article
              key={task.id}
              id={`task-${task.id}`}
              className="task-card"
              onDragOver={(event) => {
                if (dragIdRef.current) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                dropOn(task.id, event.dataTransfer.getData("text/plain") || dragIdRef.current);
              }}
            >
              <div className="task-card-main">
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
                <span className="task-card-n">{taskRowNumber(index)}</span>
                <EditableWithLinks
                  defaultValue={task.title}
                  onSave={(v) => handleTitleBlur(task.id, v)}
                  placeholder="Описание задания"
                  className="task-title"
                />
              </div>
              <div className="task-card-meta">
                <div className="task-card-deadline">
                  <DateField
                    value={toDateInputValue(task.deadline)}
                    onChange={(v) => handleDeadline(task.id, v)}
                  />
                </div>
                <div className="task-card-work">
                  <LinkCell value={task.workLink} onSave={(v) => handleLink(task.id, "workLink", v)} />
                </div>
              </div>
              <div className="task-card-tools">
                {isMentor ? (
                  <TaskStatusMenu status={task.status} onChange={(status) => handleStatus(task.id, status)} />
                ) : (
                  <span className="inline-flex flex-wrap items-center justify-end gap-2">
                    <TaskStatusMenu status={task.status} onChange={(status) => handleStatus(task.id, status)} locked />
                    {submitReviewControl(task.status) === "hidden" ? null : (
                      <SubmitForReviewButton
                        submitted={submitReviewControl(task.status) === "submitted"}
                        onSubmit={() => handleStatus(task.id, "SUBMITTED")}
                      />
                    )}
                  </span>
                )}
                <button type="button" onClick={() => handleDelete(task.id)} style={{ color: "var(--muted)" }} title="Удалить задание" aria-label="Удалить задание">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="task-card-feedback">
                <span className="task-feedback-label">Отзыв</span>
                {isMentor ? (
                  <LinkCell
                    value={task.feedbackLink}
                    limit={72}
                    onSave={(v) => handleLink(task.id, "feedbackLink", v)}
                  />
                ) : (
                  <FeedbackReadOnly value={task.feedbackLink} />
                )}
              </div>
              <div className="task-card-note">
                <TaskNote
                  value={task.notes}
                  open={expandedNotes.has(task.id)}
                  onToggle={() =>
                    setExpandedNotes((prev) => {
                      const next = new Set(prev);
                      if (next.has(task.id)) next.delete(task.id);
                      else next.add(task.id);
                      return next;
                    })
                  }
                  onSave={(v) => handleNotes(task.id, v)}
                />
              </div>
            </article>
          ))
        )}
      </div>
      )}
      {banners}
    </div>
  );
}
