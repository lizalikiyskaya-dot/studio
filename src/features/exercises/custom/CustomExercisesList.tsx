"use client";

import { useState, useTransition } from "react";
import type { CustomExercise, ExerciseComment, TaskStatus } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import Accordion from "@/components/Accordion";
import {
  createCustomExercise,
  updateExerciseTask,
  updateExerciseAnswer,
  acceptAnswerSuggestion,
  cycleExerciseStatus,
  deleteCustomExercise,
  addExerciseComment,
  updateExerciseComment,
  deleteExerciseComment,
} from "./actions";
import { nextTaskStatus } from "@/features/tasks/status";
import { wordDiff } from "@/lib/wordDiff";

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

function AnswerField({
  exercise,
  onChange,
  onAccept,
}: {
  exercise: ExerciseWithComments;
  onChange: (value: string) => void;
  onAccept: () => void;
}) {
  if (exercise.answerSuggested) {
    const tokens = wordDiff(exercise.answer, exercise.answerSuggested);
    return (
      <div className="rounded-sm p-3 mb-3 text-[13.5px] leading-relaxed" style={{ border: "1px solid var(--rule)" }}>
        {tokens.map((t, i) =>
          t.type === "same" ? (
            <span key={i}>{t.text}</span>
          ) : t.type === "del" ? (
            <span key={i} style={{ textDecoration: "line-through", color: "var(--sage)" }}>
              {t.text}
            </span>
          ) : (
            <span key={i} style={{ color: "var(--sage)" }}>
              {t.text}
            </span>
          )
        )}
        <div className="mt-2">
          <button
            onClick={onAccept}
            className="text-[12.5px] px-2.5 py-1 rounded-sm"
            style={{ color: "#fff", background: "var(--sage)" }}
          >
            ✓ принять правку
          </button>
        </div>
      </div>
    );
  }

  return (
    <AutoGrowTextarea
      defaultValue={exercise.answer}
      onBlur={onChange}
      placeholder="Ответ ученика..."
      className="w-full rounded-sm p-3 text-[13.5px] outline-none mb-3"
      style={{ border: "1px solid var(--rule)", minHeight: 90 }}
    />
  );
}

function ChatInput({
  placeholder,
  defaultValue,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  defaultValue?: string;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(defaultValue ?? "");

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText("");
  }

  return (
    <div className="flex items-end gap-1.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape" && onCancel) {
            onCancel();
          }
        }}
        placeholder={placeholder}
        rows={1}
        autoFocus={autoFocus}
        className="flex-1 outline-none bg-transparent text-[13px] leading-relaxed resize-none rounded-sm px-2 py-1.5"
        style={{ border: "1px solid var(--rule)" }}
      />
      <button
        onClick={submit}
        className="text-[12px] px-2.5 py-1.5 rounded-sm flex-shrink-0"
        style={{ background: "var(--sage)", color: "#fff" }}
      >
        ↵
      </button>
      {onCancel && (
        <button onClick={onCancel} className="text-[11px] px-1 flex-shrink-0" style={{ color: "var(--faded)" }}>
          ✕
        </button>
      )}
    </div>
  );
}

function CommentsBlock({
  comments,
  onAdd,
  onEdit,
  onDelete,
}: {
  comments: ExerciseComment[];
  onAdd: (text: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--rule)" }}>
      {comments.map((c) => (
        <div key={c.id} className="mb-2 pl-2.5" style={{ borderLeft: "2px solid var(--wine)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono-label text-[9.5px]" style={{ color: "var(--faded)" }}>
              {c.author}, {new Date(c.createdAt).toLocaleDateString("ru-RU")}
            </div>
            {editingId !== c.id && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditingId(c.id)}
                  className="font-mono-label text-[9px]"
                  style={{ color: "var(--sage)" }}
                >
                  изм.
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="font-mono-label text-[9px]"
                  style={{ color: "var(--wine)" }}
                >
                  удал.
                </button>
              </div>
            )}
          </div>
          {editingId === c.id ? (
            <div className="mt-1">
              <ChatInput
                placeholder="Изменить комментарий..."
                defaultValue={c.text}
                onSubmit={(text) => {
                  onEdit(c.id, text);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                autoFocus
              />
            </div>
          ) : (
            <div className="text-[13px] italic mt-0.5 whitespace-pre-wrap" style={{ color: "var(--ink-soft)" }}>
              {c.text}
            </div>
          )}
        </div>
      ))}
      <div className="mt-1.5">
        <ChatInput placeholder="+ комментарий..." onSubmit={onAdd} />
      </div>
    </div>
  );
}

export default function CustomExercisesList({
  studentId,
  initialExercises,
  isMentorViewer,
}: {
  studentId: string;
  initialExercises: ExerciseWithComments[];
  isMentorViewer: boolean;
}) {
  const [exercises, setExercises] = useState(initialExercises);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const exercise = await createCustomExercise(studentId);
      setExercises((prev) => [...prev, exercise]);
    });
  }

  function handleTask(id: string, value: string) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, task: value } : e)));
    startTransition(() => updateExerciseTask(id, value));
  }

  function handleAnswer(id: string, value: string) {
    const current = exercises.find((e) => e.id === id);
    startTransition(async () => {
      await updateExerciseAnswer(id, value);
      if (isMentorViewer && current?.answer) {
        setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, answerSuggested: value } : e)));
      } else {
        setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, answer: value, answerSuggested: null } : e)));
      }
    });
  }

  function handleAccept(id: string) {
    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, answer: e.answerSuggested ?? e.answer, answerSuggested: null } : e))
    );
    startTransition(() => acceptAnswerSuggestion(id));
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

  function handleAddComment(exerciseId: string, text: string) {
    startTransition(async () => {
      const comment = await addExerciseComment(exerciseId, text);
      setExercises((prev) =>
        prev.map((e) => (e.id === exerciseId ? { ...e, comments: [...e.comments, comment] } : e))
      );
    });
  }

  function handleEditComment(exerciseId: string, commentId: string, text: string) {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId
          ? { ...e, comments: e.comments.map((c) => (c.id === commentId ? { ...c, text } : c)) }
          : e
      )
    );
    startTransition(() => updateExerciseComment(commentId, text));
  }

  function handleDeleteComment(exerciseId: string, commentId: string) {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exerciseId ? { ...e, comments: e.comments.filter((c) => c.id !== commentId) } : e
      )
    );
    startTransition(() => deleteExerciseComment(commentId));
  }

  return (
    <div>
      {exercises.map((exercise) => (
        <Accordion
          key={exercise.id}
          title={exercise.task || "Без названия"}
          headerExtra={
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleStatus(exercise.id, exercise.status);
              }}
              className="font-mono-label text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
              style={STATUS_STYLE[exercise.status]}
            >
              {STATUS_LABEL[exercise.status]}
            </span>
          }
        >
          <div className="flex items-start gap-3 mb-3">
            {isMentorViewer ? (
              <AutoGrowTextarea
                defaultValue={exercise.task}
                onBlur={(v) => handleTask(exercise.id, v)}
                placeholder="Задание: ..."
                className="heading flex-1 outline-none bg-transparent text-[14.5px] font-semibold leading-snug"
              />
            ) : (
              <p className="heading flex-1 text-[14.5px] font-semibold leading-snug">{exercise.task}</p>
            )}
            {isMentorViewer && (
              <button
                onClick={() => handleDelete(exercise.id)}
                className="text-[12.5px] px-2 py-1 rounded-sm flex-shrink-0"
                style={{ color: "var(--wine)", border: "1px solid var(--wine)" }}
              >
                Удалить
              </button>
            )}
          </div>

          <AnswerField
            exercise={exercise}
            onChange={(v) => handleAnswer(exercise.id, v)}
            onAccept={() => handleAccept(exercise.id)}
          />

          <CommentsBlock
            comments={exercise.comments}
            onAdd={(text) => handleAddComment(exercise.id, text)}
            onEdit={(commentId, text) => handleEditComment(exercise.id, commentId, text)}
            onDelete={(commentId) => handleDeleteComment(exercise.id, commentId)}
          />
        </Accordion>
      ))}

      {isMentorViewer && (
        <button
          onClick={handleAdd}
          className="text-[12.5px] px-3 py-1.5 rounded-sm"
          style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
        >
          + упражнение
        </button>
      )}
    </div>
  );
}
