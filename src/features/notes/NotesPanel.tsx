"use client";

import { useState, useTransition } from "react";
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
      style={{ color: "#2a2a2a", border: "1px solid #e2e2e2" }}
    />
  );
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
        onClick={() => setOpen((v) => !v)}
        className="text-[13px] px-2 py-3"
        style={{
          position: "fixed",
          right: 0,
          left: "auto",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 9999,
          background: "#161616",
          color: "#fff",
          writingMode: "vertical-rl",
        }}
      >
        Заметки
      </button>

      {open && (
        <div
          className="flex flex-col shadow-lg"
          style={{
            position: "fixed",
            right: 0,
            left: "auto",
            top: 0,
            height: "100vh",
            zIndex: 9999,
            width: 300,
            background: "#fafafa",
            borderLeft: "1px solid #e2e2e2",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid #e2e2e2" }}
          >
            <span className="text-[13px]" style={{ color: "#161616" }}>
              Заметки
            </span>
            <button onClick={() => setOpen(false)} className="text-[16px]" style={{ color: "#9a9a9a" }}>
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notes.length === 0 && (
              <p className="px-4 py-4 text-[12.5px]" style={{ color: "#9a9a9a" }}>
                Пока нет заметок.
              </p>
            )}
            {notes.map((note) => (
              <div key={note.id} className="px-4 py-3" style={{ borderBottom: "1px solid #ececec" }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-mono-label text-[9px]" style={{ color: "#9a9a9a" }}>
                    {note.author} · {new Date(note.createdAt).toLocaleDateString("ru-RU")}
                  </div>
                  {editingId !== note.id && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setEditingId(note.id)}
                        className="font-mono-label text-[8.5px]"
                        style={{ color: "#5a5a5a" }}
                      >
                        изм.
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="font-mono-label text-[8.5px]"
                        style={{ color: "#5a5a5a" }}
                      >
                        удал.
                      </button>
                    </div>
                  )}
                </div>
                {editingId === note.id ? (
                  <NoteEditInput
                    defaultValue={note.text}
                    onSubmit={(text) => handleEdit(note.id, text)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "#2a2a2a" }}>
                    {note.text}
                  </div>
                )}
                <CommentsBlock model="Note" recordId={note.id} initialComments={initialComments[note.id] ?? []} />
              </div>
            ))}
          </div>

          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #e2e2e2", background: "#fff" }}>
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
              className="w-full outline-none bg-transparent text-[13px] leading-relaxed resize-none"
              rows={2}
              style={{ color: "#2a2a2a" }}
            />
            <button
              onClick={handleAdd}
              className="text-[12.5px] px-3 py-1.5 mt-1"
              style={{ color: "#fff", background: "#161616" }}
            >
              + добавить
            </button>
          </div>
        </div>
      )}
    </>
  );
}
