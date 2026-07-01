"use client";

import { useState, useTransition, useRef } from "react";
import { Pencil, X, CheckCircle2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import type { Note, Comment } from "@/generated/prisma/client";
import { createNote, updateNote, deleteNote, resolveNote, reopenNote } from "./actions";
import CommentsBlock from "@/features/comments/CommentsBlock";

// ─── helpers ────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ─── inline edit textarea ───────────────────────────────────────────────────

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
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (text.trim()) onSubmit(text.trim()); }
        else if (e.key === "Escape") onCancel();
      }}
      autoFocus
      rows={3}
      className="w-full outline-none text-[13px] leading-relaxed resize-none rounded-[8px] px-2.5 py-2"
      style={{ color: "var(--ink)", border: "1px solid var(--border)", background: "#fff" }}
    />
  );
}

// ─── single note card ───────────────────────────────────────────────────────

function NoteCard({
  note,
  comments,
  onEdit,
  onDelete,
  onResolve,
  onReopen,
}: {
  note: Note;
  comments: Comment[];
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(note.resolved);

  const isMentorNote = note.authorRole === "MENTOR";
  const dotColor = isMentorNote ? "var(--sage)" : "var(--accent)";
  const dotBg = isMentorNote ? "var(--sage-soft)" : "var(--accent-soft)";

  return (
    <div
      className="rounded-[14px] mb-3 overflow-hidden"
      style={{
        background: note.resolved ? "var(--bg-surface-2)" : "#fff",
        border: "1px solid var(--border)",
        opacity: note.resolved ? 0.75 : 1,
      }}
    >
      {/* header */}
      <div
        className="flex items-center gap-2 px-3.5 pt-3 pb-2"
        style={{ borderBottom: collapsed ? undefined : "1px solid var(--border)" }}
      >
        {/* avatar */}
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
          style={{ width: 24, height: 24, background: dotBg, color: dotColor, fontSize: 9.5 }}
        >
          {initials(note.author || "?")}
        </div>

        {/* author + date */}
        <div className="flex-1 min-w-0">
          <span className="text-[12.5px] font-medium" style={{ color: "var(--ink)" }}>
            {note.author}
          </span>
          <span className="text-[11px] ml-2" style={{ color: "var(--ink-faint)" }}>
            {formatDate(note.createdAt)}
          </span>
        </div>

        {/* resolve / reopen */}
        {!note.resolved ? (
          <button
            onClick={() => onResolve(note.id)}
            title="Отметить как решённое"
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ color: "var(--sage)", border: "1px solid var(--sage)", background: "var(--sage-soft)" }}
          >
            <CheckCircle2 size={11} />
            Решить
          </button>
        ) : (
          <button
            onClick={() => { onReopen(note.id); setCollapsed(false); }}
            title="Открыть снова"
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ color: "var(--ink-faint)", border: "1px solid var(--border)" }}
          >
            <RotateCcw size={10} />
            Открыть
          </button>
        )}

        {/* collapse toggle (for resolved) */}
        {note.resolved && (
          <button onClick={() => setCollapsed((v) => !v)} style={{ color: "var(--ink-faint)" }}>
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        )}
      </div>

      {/* body */}
      {!collapsed && (
        <div className="px-3.5 py-3">
          {editing ? (
            <NoteEditInput
              defaultValue={note.text}
              onSubmit={(text) => { onEdit(note.id, text); setEditing(false); }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div
              className="text-[13px] leading-relaxed whitespace-pre-wrap mb-2"
              style={{ color: note.resolved ? "var(--ink-soft)" : "var(--ink)" }}
            >
              {note.text}
            </div>
          )}

          {/* resolved-by line */}
          {note.resolved && note.resolvedBy && (
            <div className="flex items-center gap-1 mb-2 text-[11px]" style={{ color: "var(--sage)" }}>
              <CheckCircle2 size={11} />
              Решено: {note.resolvedBy}
              {note.resolvedAt && <span style={{ color: "var(--ink-faint)" }}>· {formatDate(note.resolvedAt)}</span>}
            </div>
          )}

          {/* edit / delete (only for open notes) */}
          {!note.resolved && !editing && (
            <div className="flex gap-3 mb-1">
              <button
                onClick={() => setEditing(true)}
                className="font-mono-label text-[9.5px] hover:opacity-70"
                style={{ color: "var(--ink-soft)" }}
              >
                изм.
              </button>
              <button
                onClick={() => onDelete(note.id)}
                className="font-mono-label text-[9.5px] hover:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                удал.
              </button>
            </div>
          )}

          {/* comments thread */}
          <CommentsBlock model="Note" recordId={note.id} initialComments={comments} />
        </div>
      )}
    </div>
  );
}

// ─── new note compose ───────────────────────────────────────────────────────

function ComposeArea({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSubmit(text);
    ref.current?.focus();
  }

  return (
    <div className="px-3.5 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
        }}
        placeholder="Новая заметка... (Enter — отправить, Shift+Enter — перенос)"
        rows={2}
        className="w-full outline-none text-[13px] leading-relaxed resize-none rounded-[9px] px-3 py-2"
        style={{ color: "var(--ink)", border: "1px solid var(--border)", background: "#fff" }}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px]" style={{ color: "var(--ink-faint)" }}>
          Shift+Enter — перенос строки
        </span>
        <button
          onClick={submit}
          className="text-[12.5px] px-3.5 py-1.5 rounded-full font-medium"
          style={{ color: "#fff", background: "var(--ink)" }}
        >
          + добавить
        </button>
      </div>
    </div>
  );
}

// ─── main panel ─────────────────────────────────────────────────────────────

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
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [notes, setNotes] = useState(initialNotes);
  const [comments, setComments] = useState(initialComments);
  const [, startTransition] = useTransition();

  const openNotes = notes.filter((n) => !n.resolved);
  const resolvedNotes = notes.filter((n) => n.resolved);

  function handleAdd(text: string) {
    startTransition(async () => {
      const note = await createNote(studentId, text);
      setNotes((prev) => [note, ...prev]);
      setComments((prev) => ({ ...prev, [note.id]: [] }));
    });
  }

  function handleEdit(id: string, text: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    startTransition(() => updateNote(id, text));
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить заметку?")) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => deleteNote(id));
  }

  function handleResolve(id: string) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, resolved: true, resolvedAt: new Date(), resolvedBy: "?" } : n
      )
    );
    startTransition(async () => {
      await resolveNote(id);
      // reload resolved-by label from server on next rerender via revalidate
    });
  }

  function handleReopen(id: string) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, resolved: false, resolvedAt: null, resolvedBy: "" } : n
      )
    );
    startTransition(() => reopenNote(id));
  }

  const visibleNotes = tab === "open" ? openNotes : resolvedNotes;

  return (
    <>
      {/* FAB */}
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
        {openNotes.length > 0 && (
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
            {openNotes.length}
          </span>
        )}
      </button>

      {/* overlay + panel */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        className="fixed inset-0 flex justify-end"
        style={{
          background: open ? "rgba(30,28,24,0.28)" : "transparent",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 0.22s ease, visibility 0.22s ease",
          zIndex: 90,
        }}
      >
        <div
          className="flex flex-col"
          style={{
            width: "min(400px, 92vw)",
            height: "100%",
            background: "var(--paper-light)",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.13)",
            transform: open ? "translateX(0)" : "translateX(100%)",
            transition: "transform 0.28s cubic-bezier(0.22,0.9,0.32,1)",
          }}
        >
          {/* panel header */}
          <div
            className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span className="heading text-[16px] font-semibold">Заметки</span>
            <button onClick={() => setOpen(false)} style={{ color: "var(--ink-faint)" }}>
              <X size={18} />
            </button>
          </div>

          {/* tabs */}
          <div
            className="flex flex-shrink-0 px-4 pt-3 pb-0 gap-0"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {(["open", "resolved"] as const).map((t) => {
              const label = t === "open" ? "Открытые" : "Решённые";
              const count = t === "open" ? openNotes.length : resolvedNotes.length;
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="text-[13px] font-medium pb-2.5 mr-5 relative"
                  style={{ color: active ? "var(--ink)" : "var(--ink-faint)" }}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className="ml-1.5 font-mono-label text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: active
                          ? t === "open" ? "var(--accent-soft)" : "var(--sage-soft)"
                          : "var(--bg-surface-2)",
                        color: active
                          ? t === "open" ? "var(--accent)" : "var(--sage)"
                          : "var(--ink-faint)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute bottom-0 left-0 right-0"
                      style={{ height: 2, background: "var(--ink)", borderRadius: 1 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* note list */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3.5">
            {visibleNotes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--ink-faint)" }}>
                <div className="text-[28px] mb-3 opacity-40">
                  {tab === "open" ? "✍️" : "✓"}
                </div>
                <p className="text-[13px] text-center">
                  {tab === "open"
                    ? "Заметок пока нет.\nДобавь первую ниже."
                    : "Решённых заметок нет."}
                </p>
              </div>
            )}
            {visibleNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                comments={comments[note.id] ?? []}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onResolve={handleResolve}
                onReopen={handleReopen}
              />
            ))}
          </div>

          {/* compose (open tab only) */}
          {tab === "open" && <ComposeArea onSubmit={handleAdd} />}
        </div>
      </div>
    </>
  );
}
