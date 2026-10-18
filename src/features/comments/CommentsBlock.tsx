"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import type { Comment } from "@/generated/prisma/client";
import { addComment, updateComment, deleteComment, type CommentableModel } from "./actions";

function initials(author: string) {
  const parts = author.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function when(date: Date | string) {
  const value = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "вчера";
  return value.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ChatInput({
  placeholder,
  defaultValue,
  onSubmit,
  onCancel,
  autoFocus,
  submitLabel,
}: {
  placeholder: string;
  defaultValue?: string;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  submitLabel?: string;
}) {
  const [text, setText] = useState(defaultValue ?? "");

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    if (!defaultValue) setText("");
  }

  return (
    <div className="flex items-end gap-2">
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
        className="fld flex-1 !h-auto min-h-11 py-2.5 resize-none"
      />
      <button
        type="button"
        onClick={submit}
        className="btn-y shrink-0 px-4 text-[14px]"
        style={{ height: 44, width: "auto" }}
        aria-label={submitLabel ?? "Отправить"}
      >
        <Send size={16} />
        {submitLabel ? <span>{submitLabel}</span> : null}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="h-11 px-2 shrink-0" style={{ color: "var(--muted)" }} aria-label="Отмена">
          <X size={16} />
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
    <div className="mt-4 rounded-[18px] p-4" style={{ background: "var(--soft)" }}>
      <div className="flex items-center gap-1.5 text-[13px] font-semibold">
        <MessageCircle size={14} />
        Комментарии · {comments.length}
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {comments.map((comment) => {
          const mentor = /настав/i.test(comment.author);
          return (
            <div key={comment.id} className="flex gap-2.5">
              <div
                className="avatar"
                style={{
                  width: 28,
                  height: 28,
                  fontSize: 10.5,
                  background: mentor ? "var(--deep)" : "#CDEFE2",
                  color: mentor ? "#fff" : "#1C6B4F",
                }}
              >
                {initials(comment.author)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px]">
                  <b className="font-semibold">{comment.author}</b>
                  <span style={{ color: "var(--muted)" }}> · {when(comment.createdAt)}</span>
                </div>
                {editingId === comment.id ? (
                  <div className="mt-1.5">
                    <ChatInput
                      placeholder="Изменить комментарий..."
                      defaultValue={comment.text}
                      onSubmit={(text) => handleEdit(comment.id, text)}
                      onCancel={() => setEditingId(null)}
                      autoFocus
                      submitLabel="Сохранить"
                    />
                  </div>
                ) : (
                  <>
                    <div className="mt-0.5 text-[13.5px] leading-snug whitespace-pre-wrap">{comment.text}</div>
                    <div className="mt-1 flex gap-3 text-[12.5px]">
                      <button type="button" className="lnk" onClick={() => setEditingId(comment.id)}>изменить</button>
                      <button type="button" style={{ color: "var(--muted)" }} onClick={() => handleDelete(comment.id)}>удалить</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <ChatInput placeholder="+ комментарий..." onSubmit={handleAdd} />
      </div>
    </div>
  );
}
