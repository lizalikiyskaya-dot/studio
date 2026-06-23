"use client";

import { useState, useTransition } from "react";
import type { CustomExercise, ExerciseComment, TaskStatus } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import {
  createCustomExercise,
  updateExerciseField,
  cycleExerciseStatus,
  deleteCustomExercise,
  addExerciseComment,
} from "./actions";
import { nextTaskStatus } from "@/features/tasks/status";

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

type ExerciseWithComments = CustomExercise & { comments: ExerciseComment[] };

function CommentsBlock({
  exerciseId,
  comments,
  onAdd,
}: {
  exerciseId: string;
  comments: ExerciseComment[];
  onAdd: (comment: ExerciseComment) => void;
}) {
  const [, startTransition] = useTransition();

  function handleAdd() {
    const text = window.prompt("Комментарий");
    if (!text) return;
    startTransition(async () => {
      const comment = await addExerciseComment(exerciseId, text);
      onAdd(comment);
    });
  }

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--rule)" }}>
      {comments.map((c) => (
        <div key={c.id} className="mb-2 pl-2.5" style={{ borderLeft: "2px solid var(--wine)" }}>
          <div className="font-mono-label text-[9.5px] uppercase" style={{ color: "var(--faded)" }}>
            {c.author}, {new Date(c.createdAt).toLocaleDateString("ru-RU")}
          </div>
          <div className="text-[13px] italic mt-0.5" style={{ color: "var(--ink-soft)" }}>
            {c.text}
          </div>
        </div>
      ))}
      <button onClick={handleAdd} className="text-[12.5px] underline" style={{ color: "var(--sage)" }}>
        + комментарий
      </button>
    </div>
  );
}

export default function CustomExercisesList({
  studentId,
  initialExercises,
}: {
  studentId: string;
  initialExercises: ExerciseWithComments[];
}) {
  const [exercises, setExercises] = useState(initialExercises);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const exercise = await createCustomExercise(studentId);
      setExercises((prev) => [...prev, exercise]);
    });
  }

  function handleField(id: string, field: "task" | "answer", value: string) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    startTransition(() => updateExerciseField(id, field, value));
  }

  function handleStatus(id: string, current: TaskStatus) {
    const next = nextTaskStatus(current);
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, status: next } : e)));
    startTransition(() => {
      cycleExerciseStatus(id);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить упражнение?")) return;
    setExercises((prev) => prev.filter((e) => e.id !== id));
    startTransition(() => deleteCustomExercise(id));
  }

  function handleAddComment(id: string, comment: ExerciseComment) {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, comments: [...e.comments, comment] } : e))
    );
  }

  return (
    <div>
      {exercises.map((exercise) => (
        <div key={exercise.id} className="rounded-md p-4 mb-4 max-w-[720px]" style={{ border: "1px solid var(--rule)" }}>
          <div className="flex items-start gap-3 mb-3">
            <AutoGrowTextarea
              defaultValue={exercise.task}
              onBlur={(v) => handleField(exercise.id, "task", v)}
              placeholder="Задание: ..."
              className="flex-1 outline-none bg-transparent text-[14.5px] font-semibold leading-snug"
            />
            <button
              onClick={() => handleDelete(exercise.id)}
              className="font-mono-label text-[10px] px-2 py-1 rounded-sm flex-shrink-0"
              style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
            >
              Удалить
            </button>
          </div>
          <textarea
            defaultValue={exercise.answer}
            onBlur={(e) => handleField(exercise.id, "answer", e.target.value)}
            placeholder="Ответ ученика..."
            className="w-full rounded-sm p-3 text-[13.5px] outline-none resize-vertical mb-3"
            style={{ border: "1px solid var(--rule)", minHeight: 90 }}
          />
          <button
            onClick={() => handleStatus(exercise.id, exercise.status)}
            className="font-mono-label text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap"
            style={STATUS_STYLE[exercise.status]}
          >
            {STATUS_LABEL[exercise.status]}
          </button>

          <CommentsBlock
            exerciseId={exercise.id}
            comments={exercise.comments}
            onAdd={(c) => handleAddComment(exercise.id, c)}
          />
        </div>
      ))}

      <button
        onClick={handleAdd}
        className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + упражнение
      </button>
    </div>
  );
}
