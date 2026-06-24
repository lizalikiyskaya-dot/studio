"use client";

import { useState, useTransition } from "react";
import type { Comment } from "@/generated/prisma/client";
import { addComment, updateComment, deleteComment, type CommentableModel } from "./actions";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAdd(text: string) {
    startTransition(async () => {
      const comment = await addComment(model, recordId, text);
      setComments((prev) => [...prev, comment]);
    });
  }

  function handleEdit(id: string, text: string) {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
    setEditingId(null);
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
                  onClick={() => handleDelete(c.id)}
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
                onSubmit={(text) => handleEdit(c.id, text)}
                onCancel={() => setEditingId(null)}
                autoFocus
              />
            </div>
          ) : (
            <div className="text-[13px] italic mt-0.5" style={{ color: "var(--ink-soft)" }}>
              {c.text}
            </div>
          )}
        </div>
      ))}
      <div className="mt-1.5">
        <ChatInput placeholder="+ комментарий..." onSubmit={handleAdd} />
      </div>
    </div>
  );
}
