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
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 font-mono-label text-[11px] uppercase tracking-wide px-2 py-3 rounded-l-md"
        style={{
          background: "var(--wine)",
          color: "#fff",
          writingMode: "vertical-rl",
        }}
      >
        Заметки
      </button>

      {open && (
        <div
          className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-lg"
          style={{
            width: 320,
            background:
              "repeating-linear-gradient(to bottom, #fffdf7 0px, #fffdf7 27px, #cfe0ee 28px)",
            borderLeft: "1px solid var(--rule)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: "2px solid #D9779A", background: "#fffdf7" }}
          >
            <span className="font-semibold text-[14.5px]">Заметки</span>
            <button onClick={() => setOpen(false)} className="text-[16px]" style={{ color: "var(--faded)" }}>
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            {notes.map((note) => (
              <div key={note.id} className="pt-3 pb-1 group" style={{ minHeight: 28 }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-mono-label text-[9px] uppercase" style={{ color: "var(--faded)" }}>
                    {note.author}, {new Date(note.createdAt).toLocaleDateString("ru-RU")}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(note.id, note.text)}
                      className="font-mono-label text-[8.5px]"
                      style={{ color: "var(--sage)" }}
                    >
                      изм.
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="font-mono-label text-[8.5px]"
                      style={{ color: "var(--wine)" }}
                    >
                      удал.
                    </button>
                  </div>
                </div>
                <div className="text-[13.5px] leading-7" style={{ color: "var(--ink-soft)" }}>
                  {note.text}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--rule)", background: "#fffdf7" }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Новая заметка..."
              className="w-full outline-none bg-transparent text-[13.5px] leading-7 resize-none"
              rows={2}
              style={{ color: "var(--ink-soft)" }}
            />
            <button
              onClick={handleAdd}
              className="font-mono-label text-[10.5px] px-3 py-1.5 rounded-sm mt-1"
              style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
            >
              + добавить
            </button>
          </div>
        </div>
      )}
    </>
  );
}
