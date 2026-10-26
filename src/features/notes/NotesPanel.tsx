"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useEffect, useState, useTransition, useRef } from "react";
import { useSheetSwipe } from "@/components/useSheetSwipe";
import { useRouter } from "next/navigation";
import { Pencil, X, CheckCircle2, RotateCcw, ChevronDown, ChevronUp, CornerDownRight, Quote } from "lucide-react";
import type { Note, Comment } from "@/generated/prisma/client";
import { createNote, updateNote, deleteNote, resolveNote, reopenNote, pollNotes } from "./actions";
import CommentsBlock from "@/features/comments/CommentsBlock";
import SelectionAnnotator, { type Anchor } from "./SelectionAnnotator";
import NoteMarks from "./NoteMarks";
import EmptyState from "@/components/EmptyState";
import { primeNoteChime, queueNoteChimes } from "./noteChime";
import {
  activityItems,
  fromOther,
  incomingChimes,
  openNoteCount,
  seenStorageKey,
  unreadIds,
  type ViewerRole,
} from "./noteSignals";

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
  onJump,
}: {
  note: Note;
  comments: Comment[];
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string) => void;
  onReopen: (id: string) => void;
  onJump: (note: Note) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [collapsed, setCollapsed] = useState(note.resolved);

  const isMentorNote = note.authorRole === "MENTOR";
  const dotColor = isMentorNote ? "var(--sage)" : "var(--accent)";
  const dotBg = isMentorNote ? "var(--sage-soft)" : "var(--accent-soft)";

  return (
    <div
      className="rounded-[14px] mb-3 overflow-hidden"
      onClick={(event) => {
        if (!note.anchorUrl) return;
        const target = event.target as HTMLElement;
        if (target.closest("button, a, textarea, input, select, [data-comments]")) return;
        onJump(note);
      }}
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
            style={{ color: "var(--ink)", border: "none", background: "var(--y)" }}
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
          {/* anchored quote → click navigates back to the source */}
          {note.anchorQuote && (
            <button
              onClick={() => note.anchorUrl && onJump(note)}
              disabled={!note.anchorUrl}
              className="w-full text-left rounded-[8px] px-2.5 py-2 mb-2.5 transition-colors"
              style={{
                background: "var(--bg-surface-2)",
                borderLeft: "3px solid var(--accent)",
                cursor: note.anchorUrl ? "pointer" : "default",
              }}
              title={note.anchorUrl ? "Перейти к месту" : undefined}
            >
              <div className="flex items-start gap-1.5">
                <Quote size={11} style={{ color: "var(--accent)", marginTop: 3, flexShrink: 0 }} />
                <span
                  className="text-[12px] italic leading-snug"
                  style={{
                    color: "var(--ink-soft)",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {note.anchorQuote}
                </span>
              </div>
              {note.anchorLabel && (
                <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium" style={{ color: "var(--accent)" }}>
                  <CornerDownRight size={10} />
                  {note.anchorLabel}
                </div>
              )}
            </button>
          )}
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
          <div data-comments="">
            <CommentsBlock model="Note" recordId={note.id} initialComments={comments} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── new note compose ───────────────────────────────────────────────────────

function ComposeArea({
  onSubmit,
  anchor,
  onClearAnchor,
}: {
  onSubmit: (text: string) => void;
  anchor: Anchor | null;
  onClearAnchor: () => void;
}) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const hadAnchor = useRef(false);

  // Focus the compose box once a text selection attaches an anchor.
  useEffect(() => {
    if (anchor && !hadAnchor.current) {
      hadAnchor.current = true;
      ref.current?.focus();
    } else if (!anchor) {
      hadAnchor.current = false;
    }
  }, [anchor]);

  function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    onSubmit(text);
    ref.current?.focus();
  }

  return (
    <div className="px-3.5 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
      {anchor && (
        <div
          className="flex items-start gap-1.5 rounded-[8px] px-2.5 py-1.5 mb-2"
          style={{ background: "var(--bg-surface-2)", borderLeft: "3px solid var(--accent)" }}
        >
          <Quote size={11} style={{ color: "var(--accent)", marginTop: 3, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <div
              className="text-[11.5px] italic leading-snug"
              style={{ color: "var(--ink-soft)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {anchor.quote}
            </div>
            <div className="text-[10.5px] mt-0.5" style={{ color: "var(--accent)" }}>{anchor.label}</div>
          </div>
          <button onClick={onClearAnchor} style={{ color: "var(--ink-faint)", flexShrink: 0 }} title="Убрать привязку">
            <X size={13} />
          </button>
        </div>
      )}
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
      <div className="flex items-center justify-end mt-2">
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
  viewerRole,
  initialNotes,
  initialComments,
}: {
  studentId: string;
  viewerRole: ViewerRole;
  initialNotes: Note[];
  initialComments: Record<string, Comment[]>;
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useSheetSwipe(open && mobile, () => setOpen(false), panelRef, listRef);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [notes, setNotes] = useState(initialNotes);
  const [comments, setComments] = useState(initialComments);
  const [pendingAnchor, setPendingAnchor] = useState<Anchor | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [seenReady, setSeenReady] = useState(false);
  const known = useRef<Set<string> | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    window.addEventListener("studio:toggle-notes", toggle);
    return () => window.removeEventListener("studio:toggle-notes", toggle);
  }, []);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#notes") setOpen(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 980px)");
    const apply = () => setMobile(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(seenStorageKey(studentId, viewerRole));
      const ids = raw ? JSON.parse(raw) as unknown : [];
      setSeen(new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : []));
    } catch {
      setSeen(new Set());
    }
    setSeenReady(true);
  }, [studentId, viewerRole]);

  useEffect(() => {
    known.current = new Set(activityItems(initialNotes, initialComments).map((item) => item.id));
    function prime() { primeNoteChime(); }
    window.addEventListener("pointerdown", prime);
    return () => window.removeEventListener("pointerdown", prime);
    // Снимок на загрузке: уже лежащие заметки не звенят.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    if (!flashId) return;
    const timer = window.setTimeout(() => setFlashId(null), 2200);
    return () => window.clearTimeout(timer);
  }, [flashId]);

  useEffect(() => {
    let timer = 0;
    let stopped = false;
    async function tick() {
      if (stopped || document.hidden) return;
      try {
        const data = await pollNotes(studentId);
        const items = activityItems(data.notes, data.comments);
        if (known.current) {
          const result = incomingChimes(known.current, items, viewerRole);
          known.current = result.next;
          if (result.play.length) queueNoteChimes(result.play.length);
        }
        setNotes((prev) => {
          const ids = new Set(data.notes.map((note) => note.id));
          const extra = prev.filter((note) => !ids.has(note.id));
          const same = extra.length === 0
            && prev.length === data.notes.length
            && prev.every((note, index) => {
              const next = data.notes[index];
              return next && note.id === next.id && note.text === next.text && note.resolved === next.resolved && note.anchorQuote === next.anchorQuote;
            });
          if (same) return prev;
          return [...data.notes, ...extra];
        });
        setComments((prev) => {
          const prevIds = Object.values(prev).flat().map((comment) => `${comment.id}:${comment.text}`).join("|");
          const nextIds = Object.values(data.comments).flat().map((comment) => `${comment.id}:${comment.text}`).join("|");
          return prevIds === nextIds ? prev : data.comments;
        });
      } catch {
        // Сеть или сессия: следующий тик попробует снова.
      }
    }
    timer = window.setInterval(() => void tick(), 5000);
    function onVisible() {
      if (!document.hidden) void tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [studentId, viewerRole]);

  const openNotes = notes.filter((n) => !n.resolved);
  const resolvedNotes = notes.filter((n) => n.resolved);
  const activity = activityItems(notes, comments);
  const unread = seenReady ? unreadIds(seen, activity, viewerRole) : [];

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("studio:notes-open-count", { detail: openNoteCount(notes) }));
  }, [notes]);

  useEffect(() => {
    if (!open || !seenReady) return;
    const next = new Set(seen);
    let changed = false;
    for (const item of activity) {
      if (!fromOther(viewerRole, item.author) || next.has(item.id)) continue;
      next.add(item.id);
      changed = true;
    }
    if (!changed) return;
    setSeen(next);
    localStorage.setItem(seenStorageKey(studentId, viewerRole), JSON.stringify([...next]));
  }, [open, seenReady, seen, activity, viewerRole, studentId]);

  // A text selection fired the "Заметка" button: open the panel and attach
  // the quoted fragment to the compose box for the user to annotate.
  function handleAnnotate(anchor: Anchor) {
    setPendingAnchor(anchor);
    setTab("open");
    setOpen(true);
  }

  function handleJump(note: Note) {
    if (!note.anchorUrl) return;
    setFlashId(note.id);
    setOpen(false);
    const here = window.location.pathname + window.location.search;
    if (here !== note.anchorUrl) router.push(note.anchorUrl);
  }

  function handleAdd(text: string) {
    const anchor = pendingAnchor;
    setPendingAnchor(null);
    startTransition(async () => {
      const note = await createNote(studentId, text, anchor ?? undefined);
      setNotes((prev) => [note, ...prev]);
      setComments((prev) => ({ ...prev, [note.id]: [] }));
    });
  }

  function handleEdit(id: string, text: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
    startTransition(() => updateNote(id, text));
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить заметку?"))) return;
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
      {/* Global: watch for text selection anywhere → floating "Заметка" button */}
      <SelectionAnnotator onAnnotate={handleAnnotate} />

      {/* FAB */}
      <NoteMarks notes={notes} flashId={flashId} />

      <button
        onClick={() => setOpen(true)}
        className={`notes-fab flex items-center justify-center rounded-full${unread.length > 0 ? " is-unread" : ""}`}
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
              background: "var(--danger)",
              color: "#fff",
              fontSize: 10,
              boxShadow: "0 0 0 2px var(--bg-card)",
            }}
          >
            {openNotes.length}
          </span>
        )}
      </button>

      {/* overlay + panel */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        className={`notes-layer${open ? " is-open" : ""}`}
      >
        <div ref={panelRef} data-notes-ui="1" className="notes-panel">
          <button type="button" className="sheet-grab" data-sheet-handle aria-label="Потяните вниз, чтобы закрыть">
            <span />
          </button>
          <div className="notes-head">
            <span className="heading text-[16px] font-semibold">Заметки</span>
            <button type="button" className="notes-close" onClick={() => setOpen(false)} aria-label="Закрыть">
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
          <div ref={listRef} className="notes-scroll px-3.5 py-3.5">
            {visibleNotes.length === 0 && (
              <EmptyState
                compact
                cue={tab === "open" ? "Самое время оставить заметку" : "Самое время закрыть вопрос"}
                detail={tab === "open" ? "Напишите первую заметку внизу." : "Решённые заметки соберутся в этой вкладке."}
              />
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
                onJump={handleJump}
              />
            ))}
          </div>

          {/* compose (open tab only) */}
          {tab === "open" && (
            <ComposeArea
              onSubmit={handleAdd}
              anchor={pendingAnchor}
              onClearAnchor={() => setPendingAnchor(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}
