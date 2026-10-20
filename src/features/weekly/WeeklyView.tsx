import PageHeader from "@/components/PageHeader";
import ReadingText from "@/components/ReadingText";
import StarsStatus from "@/features/stars/StarsStatus";
import { formatWeeklyDate, pickWeekly, weekPhase } from "./schedule";
import WeeklyForm from "./WeeklyForm";

type TaskRow = {
  id: string;
  publishedOn: string;
  title: string;
  prompt: string;
  lengthHint: string;
  sortOrder: number;
};

type SubmissionRow = {
  weeklyTaskId: string;
  text: string;
};

const PHASE_LABEL = {
  current: "сейчас",
  past: "прошла",
  upcoming: "позже",
} as const;

export default function WeeklyView({
  studentId,
  canSubmit,
  isMentor,
  tasks,
  submissions,
  total,
  today,
}: {
  studentId: string;
  canSubmit: boolean;
  isMentor: boolean;
  tasks: TaskRow[];
  submissions: SubmissionRow[];
  total: number;
  today: string;
}) {
  const byTask = new Map(submissions.map((row) => [row.weeklyTaskId, row]));
  const { current } = pickWeekly(tasks, today);
  const focus = current ?? tasks.find((task) => task.publishedOn > today) ?? null;
  const open = Boolean(current && focus && focus.id === current.id);
  const saved = focus ? byTask.get(focus.id) : undefined;

  const availability = !open
    ? "пока только для чтения"
    : canSubmit
      ? "можно сдать"
      : saved?.text
        ? "сдано"
        : isMentor
          ? "ещё не сдано"
          : "сдать можно в день публикации";

  return (
    <div className="weekly-page">
      <PageHeader title="Задание недели" />
      <StarsStatus total={total} />

      {!focus ? (
        <p className="mt-5 text-[15px]" style={{ color: "var(--ink2)" }}>
          Задания недели ещё не опубликованы.
        </p>
      ) : (
        <article className="sheet mt-4 px-4 py-3" style={{ overflow: "hidden" }}>
          <h2 className="text-[18px] leading-snug">{focus.title}</h2>
          <ReadingText text={focus.prompt} className="mt-2" />
          <p className="mt-2 text-[12.5px]" style={{ color: "var(--muted)" }}>
            {formatWeeklyDate(focus.publishedOn)} · Сколько: {focus.lengthHint} · {availability}
          </p>
          {open && canSubmit ? (
            <WeeklyForm studentId={studentId} weeklyTaskId={focus.id} initialText={saved?.text ?? ""} />
          ) : null}
          {open && !canSubmit && saved?.text ? (
            <ReadingText text={saved.text} className="mt-3" />
          ) : null}
        </article>
      )}

      {tasks.length > 0 ? (
        <section className="mt-5">
          <h2 className="text-[16px]">Все недели</h2>
          <div className="mt-2 flex flex-col gap-1.5">
            {tasks.map((task) => {
              const phase = weekPhase(task, today, current?.id ?? null);
              const text = byTask.get(task.id)?.text ?? "";
              const done = text.trim().length > 0;
              return (
                <article key={task.id} className="rounded-[12px] px-3 py-1.5" style={{ border: "1px solid var(--border)" }}>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[12.5px]" style={{ color: "var(--muted)" }}>
                      {formatWeeklyDate(task.publishedOn)}
                    </span>
                    <span className="text-[14.5px] font-semibold">{task.title}</span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[12px]"
                      style={
                        done
                          ? { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" }
                          : phase === "current"
                            ? { background: "var(--y)", color: "var(--ink)" }
                            : { background: "var(--soft)", color: "var(--ink2)" }
                      }
                    >
                      {done ? "сдано" : PHASE_LABEL[phase]}
                    </span>
                  </div>
                  {phase === "past" && done ? (
                    <ReadingText text={text} className="mt-2" />
                  ) : null}
                  {phase === "past" && !done ? (
                    <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>
                      {isMentor ? "Не сдано." : "Не сдано. Прошлая неделя уже закрыта."}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
