import PageHeader from "@/components/PageHeader";
import StarsStatus from "@/features/stars/StarsStatus";
import { STAR_POINTS } from "@/features/stars/rules";
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

  return (
    <div>
      <PageHeader
        title="Задание недели"
        description="Необязательное короткое задание. Сдаётся здесь и сразу даёт 2 звёздочки. С основными заданиями не пересекается."
      />
      <StarsStatus total={total} />
      <ul className="mt-4 flex flex-wrap gap-2 text-[13px]" style={{ color: "var(--ink2)" }}>
        <li className="rounded-full px-3 py-1" style={{ background: "var(--soft)" }}>
          {STAR_POINTS.WEEKLY} — задание недели
        </li>
        <li className="rounded-full px-3 py-1" style={{ background: "var(--soft)" }}>
          {STAR_POINTS.MAIN_TASK} — основное задание
        </li>
        <li className="rounded-full px-3 py-1" style={{ background: "var(--soft)" }}>
          {STAR_POINTS.CONTEST} — отправка на конкурс
        </li>
        <li className="rounded-full px-3 py-1" style={{ background: "var(--soft)" }}>
          {STAR_POINTS.PUBLISHER} — отправка в издательство
        </li>
      </ul>

      {!focus ? (
        <p className="mt-8 text-[16px]" style={{ color: "var(--ink2)" }}>
          Задания недели ещё не опубликованы.
        </p>
      ) : (
        <article className="sheet mt-6 px-5 py-5 sm:px-6" style={{ overflow: "hidden" }}>
          <p className="serif text-[16px] italic" style={{ color: "var(--v)" }}>
            {formatWeeklyDate(focus.publishedOn)}
          </p>
          <h2 className="mt-2 text-[26px] leading-tight">{focus.title}</h2>
          <p className="field-literary mt-4 text-[17px] leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
            {focus.prompt}
          </p>
          <p className="mt-3 text-[13.5px]" style={{ color: "var(--muted)" }}>
            Сколько: {focus.lengthHint}
          </p>
          {open && canSubmit ? (
            <WeeklyForm studentId={studentId} weeklyTaskId={focus.id} initialText={saved?.text ?? ""} />
          ) : null}
          {open && !canSubmit ? (
            <div className="mt-5">
              {saved?.text ? (
                <p className="field-literary text-[17px] leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
                  {saved.text}
                </p>
              ) : (
                <p className="text-[15px]" style={{ color: "var(--ink2)" }}>
                  {isMentor ? "Ученик ещё не сдал это задание." : "Сдать можно в день публикации и до следующего задания."}
                </p>
              )}
            </div>
          ) : null}
          {!open ? (
            <p className="mt-5 text-[15px]" style={{ color: "var(--ink2)" }}>
              Сдать можно с {formatWeeklyDate(focus.publishedOn)}. Пока задание только для чтения.
            </p>
          ) : null}
        </article>
      )}

      {tasks.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-[22px]">Все недели</h2>
          <div className="mt-3 flex flex-col gap-3">
            {tasks.map((task) => {
              const phase = weekPhase(task, today, current?.id ?? null);
              const text = byTask.get(task.id)?.text ?? "";
              const done = text.trim().length > 0;
              return (
                <article key={task.id} className="rounded-[14px] px-4 py-3" style={{ border: "1px solid var(--border)" }}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[13.5px]" style={{ color: "var(--muted)" }}>
                      {formatWeeklyDate(task.publishedOn)}
                    </span>
                    <span className="text-[16px] font-semibold">{task.title}</span>
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
                    <p className="field-literary mt-2 text-[16px] leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
                      {text}
                    </p>
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
