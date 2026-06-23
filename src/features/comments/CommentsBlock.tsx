"use client";

import { useState, useTransition } from "react";
import type { Comment } from "@/generated/prisma/client";
import { addComment, updateComment, deleteComment, type CommentableModel } from "./actions";

export default function CommentsBlock({
  model,
  recordId,
  initialComments,
}: {
  model: CommentableModel;
  recordId: string;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [, startTransition] = useTransition();

  function handleAdd() {
    const text = window.prompt("Комментарий");
    if (!text) return;
    startTransition(async () => {
      const comment = await addComment(model, recordId, text);
      setComments((prev) => [...prev, comment]);
    });
  }

  function handleEdit(id: string, currentText: string) {
    const text = window.prompt("Изменить комментарий", currentText);
    if (text === null) return;
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
    startTransition(() => updateComment(id, text));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить комментарий?")) return;
    setComments((prev) => prev.filter((c) => c.id !== id));
    startTransition(() => deleteComment(id));
  }

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--rule)" }}>
      {comments.map((c) => (
        <div key={c.id} className="mb-2 pl-2.5 group" style={{ borderLeft: "2px solid var(--wine)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono-label text-[9.5px] uppercase" style={{ color: "var(--faded)" }}>
              {c.author}, {new Date(c.createdAt).toLocaleDateString("ru-RU")}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleEdit(c.id, c.text)}
                className="font-mono-label text-[9px]"
                style={{ color: "var(--sage)" }}
              >
                изм.
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="font-mono-label text-[9px]"
                style={{ color: "var(--wine)" }}
              >
                удал.
              </button>
            </div>
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
