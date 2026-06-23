"use client";

import { useState, useTransition } from "react";
import type { Note } from "@/generated/prisma/client";
import { createNote, updateNote, deleteNote } from "./actions";

export default function NotesPanel({
  studentId,
  initialNotes,
}: {
  studentId: string;
  initialNotes: Note[];
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
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

  function handleEdit(id: string, currentText: string) {
    const text = window.prompt("Изменить заметку", currentText);
    if (text === null) return;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
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
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 font-mono-label text-[10.5px] uppercase tracking-wide px-2 py-3"
        style={{
          background: "#161616",
          color: "#fff",
          writingMode: "vertical-rl",
        }}
      >
        Заметки
      </button>

      {open && (
        <div
          className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-lg"
          style={{ width: 300, background: "#fafafa", borderLeft: "1px solid #e2e2e2" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid #e2e2e2" }}
          >
            <span className="font-mono-label text-[10.5px] uppercase tracking-wide" style={{ color: "#161616" }}>
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
                  <div className="font-mono-label text-[9px] uppercase" style={{ color: "#9a9a9a" }}>
                    {note.author} · {new Date(note.createdAt).toLocaleDateString("ru-RU")}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(note.id, note.text)}
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
                </div>
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "#2a2a2a" }}>
                  {note.text}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #e2e2e2", background: "#fff" }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Новая заметка..."
              className="w-full outline-none bg-transparent text-[13px] leading-relaxed resize-none"
              rows={2}
              style={{ color: "#2a2a2a" }}
            />
            <button
              onClick={handleAdd}
              className="font-mono-label text-[10px] uppercase tracking-wide px-3 py-1.5 mt-1"
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
