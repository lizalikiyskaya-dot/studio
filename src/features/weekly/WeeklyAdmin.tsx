"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { siteConfirm } from "@/components/SiteDialog";
import { Button } from "@/components/ui/Button";
import { formatWeeklyDate, pickWeekly, weekPhase, type WeekPhase } from "./schedule";
import { createWeeklyTask, deleteWeeklyTask, updateWeeklyTask, type WeeklyDraft } from "./mentorActions";

export type WeeklyAdminRow = WeeklyDraft & {
  id: string;
  sortOrder: number;
  submissions: number;
  phase: WeekPhase;
};

const EMPTY: WeeklyDraft = { publishedOn: "", title: "", prompt: "", lengthHint: "" };

const PHASE_LABEL = { current: "сейчас", past: "прошла", upcoming: "позже" } as const;

function Notice({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p
      className="mt-3 rounded-[14px] px-4 py-2.5 text-[13.5px]"
      role="status"
      style={
        ok
          ? { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" }
          : { background: "var(--pill-red-bg)", color: "var(--pill-red-fg)" }
      }
    >
      {text}
    </p>
  );
}

export default function WeeklyAdmin({ tasks: initial, today }: { tasks: WeeklyAdminRow[]; today: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const current = tasks.find((task) => task.phase === "current") ?? null;
  const [openId, setOpenId] = useState<string | null>(current?.id ?? tasks[0]?.id ?? null);
  const [draft, setDraft] = useState(EMPTY);
  const [draftNote, setDraftNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [rowNote, setRowNote] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh(next: WeeklyAdminRow[]) {
    const sorted = [...next].sort((a, b) => a.publishedOn.localeCompare(b.publishedOn) || a.id.localeCompare(b.id));
    const currentId = pickWeekly(sorted, today).current?.id ?? null;
    setTasks(sorted.map((task) => ({ ...task, phase: weekPhase(task, today, currentId) })));
    router.refresh();
  }

  function add() {
    setDraftNote(null);
    startTransition(async () => {
      const result = await createWeeklyTask(draft);
      if ("error" in result) {
        setDraftNote({ ok: false, text: result.error });
        return;
      }
      const row: WeeklyAdminRow = { id: result.id, ...draft, sortOrder: tasks.length + 1, submissions: 0, phase: "upcoming" };
      setDraft(EMPTY);
      setOpenId(result.id);
      setDraftNote({ ok: true, text: "Задание добавлено." });
      refresh([...tasks, { ...row, publishedOn: draft.publishedOn.trim(), title: draft.title.trim(), prompt: draft.prompt.trim(), lengthHint: draft.lengthHint.trim() }]);
    });
  }

  function save(task: WeeklyAdminRow) {
    setRowNote(null);
    startTransition(async () => {
      const result = await updateWeeklyTask(task.id, task);
      if ("error" in result) {
        setRowNote({ id: task.id, ok: false, text: result.error });
        return;
      }
      setRowNote({ id: task.id, ok: true, text: "Сохранено." });
      refresh(tasks.map((row) => (row.id === task.id ? { ...task, title: task.title.trim(), prompt: task.prompt.trim(), lengthHint: task.lengthHint.trim(), publishedOn: task.publishedOn.trim() } : row)));
    });
  }

  async function remove(task: WeeklyAdminRow) {
    const yes = await siteConfirm(`Удалить задание «${task.title}»?`);
    if (!yes) return;
    startTransition(async () => {
      const result = await deleteWeeklyTask(task.id);
      if ("error" in result) {
        setRowNote({ id: task.id, ok: false, text: result.error });
        return;
      }
      refresh(tasks.filter((row) => row.id !== task.id));
    });
  }

  function patch(id: string, partial: Partial<WeeklyAdminRow>) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...partial } : task)));
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 820 }}>
      <section className="sheet px-5 py-5 sm:px-6">
        <h2 className="text-[20px]">Новое задание</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="fld-label">
            Дата публикации
            <input className="fld" type="date" value={draft.publishedOn} onChange={(event) => setDraft({ ...draft, publishedOn: event.target.value })} />
          </label>
          <label className="fld-label">
            Объём
            <input className="fld" value={draft.lengthHint} onChange={(event) => setDraft({ ...draft, lengthHint: event.target.value })} placeholder="полстраницы" />
          </label>
        </div>
        <label className="fld-label">
          Название
          <input className="fld" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </label>
        <label className="fld-label">
          Текст
          <textarea className="fld field-literary text-[17px] leading-relaxed" rows={5} value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} />
        </label>
        <div className="mt-4">
          <Button type="button" pill disabled={pending} onClick={add}>
            {pending ? "Сохраняем…" : "Добавить задание"}
          </Button>
        </div>
        {draftNote ? <Notice ok={draftNote.ok} text={draftNote.text} /> : null}
      </section>

      <p className="text-[14px]" style={{ color: "var(--ink2)" }}>
        В списке {tasks.length}. Ученик сдаёт ту неделю, чья дата уже наступила и ещё не сменилась следующей.
      </p>

      {tasks.map((task) => {
        const open = openId === task.id;
        return (
          <article
            key={task.id}
            className="rounded-[14px] px-4 py-4 sm:px-5"
            style={{ border: "1px solid var(--border)", background: task.phase === "current" ? "var(--note)" : "#fff" }}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="serif text-[15px] italic" style={{ color: "var(--v)" }}>
                {formatWeeklyDate(task.publishedOn)}
              </span>
              <span className="text-[18px] font-semibold">{task.title || "Без названия"}</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[12px] font-medium"
                style={
                  task.phase === "current"
                    ? { background: "var(--y)", color: "var(--ink)" }
                    : { background: "var(--soft)", color: "var(--ink2)" }
                }
              >
                {PHASE_LABEL[task.phase]}
              </span>
              <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                сдач: {task.submissions}
              </span>
              <button type="button" className="ml-auto text-[13.5px]" style={{ color: "var(--vi)" }} onClick={() => setOpenId(open ? null : task.id)}>
                {open ? "Свернуть" : "Править"}
              </button>
            </div>
            {!open ? (
              <p className="field-literary mt-2 text-[16px] leading-relaxed" style={{ color: "var(--ink2)" }}>
                {task.prompt.length > 220 ? `${task.prompt.slice(0, 220)}…` : task.prompt}
              </p>
            ) : (
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="fld-label">
                    Дата публикации
                    <input className="fld" type="date" value={task.publishedOn} onChange={(event) => patch(task.id, { publishedOn: event.target.value })} />
                  </label>
                  <label className="fld-label">
                    Объём
                    <input className="fld" value={task.lengthHint} onChange={(event) => patch(task.id, { lengthHint: event.target.value })} />
                  </label>
                </div>
                <label className="fld-label">
                  Название
                  <input className="fld" value={task.title} onChange={(event) => patch(task.id, { title: event.target.value })} />
                </label>
                <label className="fld-label">
                  Текст
                  <textarea className="fld field-literary text-[17px] leading-relaxed" rows={6} value={task.prompt} onChange={(event) => patch(task.id, { prompt: event.target.value })} />
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="button" pill disabled={pending} onClick={() => save(task)}>
                    Сохранить
                  </Button>
                  {task.submissions === 0 ? (
                    <button type="button" className="rounded-full px-4 text-[14px]" style={{ height: 44, color: "var(--danger)" }} disabled={pending} onClick={() => remove(task)}>
                      Удалить
                    </button>
                  ) : (
                    <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                      Есть сдачи, удалить нельзя.
                    </span>
                  )}
                </div>
                {rowNote?.id === task.id ? <Notice ok={rowNote.ok} text={rowNote.text} /> : null}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
