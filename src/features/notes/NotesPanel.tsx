"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import type { Note, Comment } from "@/generated/prisma/client";
import { createNote, updateNote, deleteNote } from "./actions";
import CommentsBlock from "@/features/comments/CommentsBlock";

function NoteEditInput({
  defaultValue,
  onSubmit,
  onCancel,
}: {
  defaultValue: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(defaultValue);
  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (text.trim()) onSubmit(text.trim());
        } else if (e.key === "Escape") {
          onCancel();
        }
      }}
      autoFocus
      rows={2}
      className="w-full outline-none bg-transparent text-[13px] leading-relaxed resize-none rounded-sm px-1.5 py-1"
      style={{ color: "var(--ink)", border: "1px solid var(--rule)" }}
    />
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function NotesPanel({
  studentId,
  initialNotes,
  initialComments,
}: {
  studentId: string;
  initialNotes: Note[];
  initialComments: Record<string, Comment[]>;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleAdd() {
    if (!draft.trim()) return;
    const text = draft;
    setDraft("");
    startTransition(async () => {
      const note = await createNote(studentId, text);
      setNotes((prev) => [note, ...prev]);
    });
  }

  function handleEdit(id: string, text: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    setEditingId(null);
    startTransition(() => updateNote(id, text));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить заметку?")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => deleteNote(id));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded-full"
        style={{
          position: "fixed",
          right: 28,
          bottom: 28,
          zIndex: 90,
          width: 52,
          height: 52,
          background: "var(--ink)",
          color: "#fff",
          boxShadow: "var(--shadow-md)",
        }}
        title="Заметки"
      >
        <Pencil size={20} />
        {notes.length > 0 && (
          <span
            className="font-mono-label flex items-center justify-center rounded-full"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 20,
              height: 20,
              background: "var(--wine)",
              color: "#fff",
              fontSize: 10,
              boxShadow: "0 0 0 2px var(--paper-light)",
            }}
          >
            {notes.length}
          </span>
        )}
      </button>

      <div
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        className="fixed inset-0 flex justify-end"
        style={{
          background: open ? "rgba(30,28,24,0.32)" : "transparent",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 0.25s ease, visibility 0.25s ease, background 0.25s ease",
          zIndex: 90,
        }}
      >
        <div
          className="flex flex-col"
          style={{
            width: "min(360px, 90vw)",
            height: "100%",
            background: "var(--paper-light)",
            boxShadow: "-8px 0 28px rgba(0,0,0,0.12)",
            transform: open ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.3s cubic-bezier(0.22,0.9,0.32,1)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--rule)" }}
          >
            <span className="heading text-[16px]">Заметки</span>
            <button onClick={() => setOpen(false)} style={{ color: "var(--faded)" }}>
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3.5 py-3">
            {notes.length === 0 && (
              <p className="px-1.5 py-4 text-[12.5px]" style={{ color: "var(--faded)" }}>
                Пока нет заметок.
              </p>
            )}
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-[14px] px-3.5 py-3 mb-2.5"
                style={{ background: "var(--bg-surface-2)", borderLeft: "3px solid var(--wine)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ width: 22, height: 22, background: "var(--wine)", color: "#fff", fontSize: 9.5, fontWeight: 700 }}
                  >
                    {initialsOf(note.author || "?")}
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: "var(--ink)" }}>
                    {note.author}
                  </span>
                  <span className="text-[11px] ml-auto" style={{ color: "var(--faded)" }}>
                    {new Date(note.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                {editingId === note.id ? (
                  <NoteEditInput
                    defaultValue={note.text}
                    onSubmit={(text) => handleEdit(note.id, text)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink)" }}>
                    {note.text}
                  </div>
                )}
                {editingId !== note.id && (
                  <div className="flex gap-3 mt-1.5">
                    <button
                      onClick={() => setEditingId(note.id)}
                      className="font-mono-label text-[9px]"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      изм.
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="font-mono-label text-[9px]"
                      style={{ color: "var(--wine)" }}
                    >
                      удал.
                    </button>
                  </div>
                )}
                <CommentsBlock model="Note" recordId={note.id} initialComments={initialComments[note.id] ?? []} />
              </div>
            ))}
          </div>

          <div className="px-3.5 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--rule)" }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Новая заметка... (Enter — отправить)"
              className="w-full outline-none bg-transparent text-[13px] leading-relaxed resize-none rounded-sm px-2 py-1.5"
              rows={2}
              style={{ color: "var(--ink)", border: "1px solid var(--rule)" }}
            />
            <button
              onClick={handleAdd}
              className="text-[12.5px] px-3 py-1.5 mt-1.5 rounded-full"
              style={{ color: "#fff", background: "var(--ink)" }}
            >
              + добавить
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
