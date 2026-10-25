"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Comment } from "@/generated/prisma/client";
import {
  createAct,
  createPlanScene,
  deleteAct,
  deleteStorylineBlock,
  movePlanScene,
  setPlanView,
  updateStorylineBlockColor,
  updateStorylineBlockField,
  updateStorylineBlockSpan,
  type StorylineColor,
} from "./actions";
import { createPlanChapter, deletePlanChapter, updatePlanChapterNumber } from "@/features/books/actions";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { blurOnEnter } from "@/lib/blurOnEnter";
import {
  foldedDescription,
  formatChars,
  normalizePlanView,
  parseChars,
  progressKind,
  progressPercent,
  type PlanView,
  type ProgressKind,
} from "./chapterText";

const SANS = "var(--font-sans), Onest, system-ui, sans-serif";
const WASH: Record<ProgressKind, string> = {
  none: "#F3F1EC",
  work: "#E6ECFF",
  almost: "#FFF1B8",
  done: "#D5F3E7",
};
const FILL: Record<ProgressKind, string> = {
  none: "#D9D3C7",
  work: "#6553E8",
  almost: "#FFD43B",
  done: "#2FB083",
};

export type PlanScene = {
  id: string;
  order: number;
  color: string;
  name: string;
  description: string;
  span: number;
};

export type PlanChapterModel = {
  id: string;
  order: number;
  title: string;
  description: string;
  summary: string;
  dramaticArgument: string;
  note: string;
  images: string;
  plannedChars: number;
  writtenChars: number;
  color: string | null;
  actBreakAfter: boolean;
  actId: string | null;
  blocks: PlanScene[];
};

export type PlanActModel = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  content: string;
  status: string;
};

type SuggestionMap = Record<string, Record<string, string | null | undefined>>;

const COLORS: { value: StorylineColor; dot: string; bg: string; fg: string }[] = [
  { value: "sage", dot: "#2FB083", bg: "#D5F3E7", fg: "#14684B" },
  { value: "lavender", dot: "#7B6CF6", bg: "#E6E2FF", fg: "#4B3FC0" },
  { value: "ochre", dot: "#F28A3C", bg: "#FFE8D6", fg: "#9A4B12" },
  { value: "blue", dot: "#3B9EDB", bg: "#DDF0FB", fg: "#18638F" },
  { value: "pink", dot: "#E0528A", bg: "#FCE1EC", fg: "#9C2C58" },
];
const COLOR = Object.fromEntries(COLORS.map((item) => [item.value, item])) as Record<string, (typeof COLORS)[number]>;

const VIEWS: { id: PlanView; label: string }[] = [
  { id: "ribbon", label: "Лента" },
  { id: "tiles", label: "Плитки" },
  { id: "map", label: "Карта" },
];

const LEGEND: { kind: ProgressKind; label: string }[] = [
  { kind: "none", label: "не начата" },
  { kind: "work", label: "в работе" },
  { kind: "almost", label: "почти" },
  { kind: "done", label: "готова" },
];

function lineKey(block: PlanScene) {
  const name = block.name.trim().toLowerCase();
  return name ? `${block.color}::${name}` : `id:${block.id}`;
}

function kindOf(chapter: { writtenChars: number; plannedChars: number }) {
  return progressKind(chapter.writtenChars, chapter.plannedChars);
}

function percentOf(chapters: { writtenChars: number; plannedChars: number }[]) {
  const planned = chapters.reduce((sum, chapter) => sum + chapter.plannedChars, 0);
  const written = chapters.reduce((sum, chapter) => sum + chapter.writtenChars, 0);
  return progressPercent(written, planned);
}

function chapterNumbers(chapters: PlanChapterModel[]) {
  const sorted = chapters.slice().sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return new Map(sorted.map((chapter, index) => [chapter.id, index + 1]));
}

function columnsFor(acts: PlanActModel[], chapters: PlanChapterModel[]) {
  const grouped = new Map<string, PlanChapterModel[]>();
  for (const chapter of chapters) {
    const key = chapter.actId ?? "";
    const list = grouped.get(key) ?? [];
    list.push(chapter);
    grouped.set(key, list);
  }
  for (const list of grouped.values()) list.sort((a, b) => a.order - b.order);
  const sorted = acts.slice().sort((a, b) => a.order - b.order);
  const lastId = sorted.at(-1)?.id;
  const named = sorted
    .filter((act) => {
      const items = grouped.get(act.id) ?? [];
      if (items.length > 0) return true;
      if (act.id === lastId) return true;
      if (act.subtitle.trim() || act.content.trim()) return true;
      return Boolean(act.title.trim() && !/^Акт \d+$/.test(act.title.trim()));
    })
    .map((act) => ({ act, chapters: grouped.get(act.id) ?? [] }));
  return { named, loose: grouped.get("") ?? [] };
}

function Legend() {
  return (
    <div className="chapter-legend" aria-label="Прогресс глав" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 6 }}>
      {LEGEND.map((item) => (
        <span key={item.kind} style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13, fontFamily: SANS }}>
          <i style={{ width: 12, height: 12, borderRadius: 99, background: item.kind === "none" ? "#D9D3C7" : FILL[item.kind], display: "inline-block" }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ProgressChip({ chapters }: { chapters: { writtenChars: number; plannedChars: number }[] }) {
  const planned = chapters.reduce((sum, chapter) => sum + chapter.plannedChars, 0);
  const written = chapters.reduce((sum, chapter) => sum + chapter.writtenChars, 0);
  const kind = progressKind(written, planned);
  const label = LEGEND.find((item) => item.kind === kind)?.label ?? "";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 8px", background: WASH[kind], color: "#202020", fontSize: 12, fontWeight: 650, fontFamily: SANS, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function Ring({ percent }: { percent: number }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const shown = Math.min(100, Math.max(0, percent));
  const dash = (circ * shown) / 100;
  return (
    <svg className="plan-ring" width={72} height={72} viewBox="0 0 72 72" aria-hidden="true" style={{ width: 72, height: 72, flex: "none", display: "block" }}>
      <circle cx="36" cy="36" r={radius} fill="none" stroke="#ececec" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="#202020"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ - dash}`}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="650">{percent}%</text>
    </svg>
  );
}

export default function BookPlanBoard({
  bookId,
  studentId,
  initialView,
  initialActs,
  initialChapters,
  suggestions,
  actSuggestions,
  comments,
  banners,
  bookSelect,
  openChapterId,
}: {
  bookId: string;
  studentId: string;
  initialView: string;
  initialActs: PlanActModel[];
  initialChapters: PlanChapterModel[];
  suggestions: SuggestionMap;
  actSuggestions: SuggestionMap;
  comments: Record<string, Comment[]>;
  banners?: ReactNode;
  bookSelect?: ReactNode;
  openChapterId?: string | null;
}) {
  const [acts, setActs] = useState(initialActs);
  const [chapters, setChapters] = useState(initialChapters);
  const [view, setView] = useState<PlanView>(normalizePlanView(initialView));
  const [openId, setOpenId] = useState<string | null>(openChapterId ?? null);
  const [, startTransition] = useTransition();

  const numbers = useMemo(() => chapterNumbers(chapters), [chapters]);
  const { named, loose } = useMemo(() => columnsFor(acts, chapters), [acts, chapters]);
  const open = chapters.find((chapter) => chapter.id === openId) ?? null;
  const openAct = open ? acts.find((act) => act.id === open.actId) ?? null : null;

  function patchChapter(id: string, patch: Partial<PlanChapterModel>) {
    setChapters((prev) => prev.map((chapter) => (chapter.id === id ? { ...chapter, ...patch } : chapter)));
  }

  function patchAct(id: string, patch: Partial<PlanActModel>) {
    setActs((prev) => prev.map((act) => (act.id === id ? { ...act, ...patch } : act)));
  }

  function patchScene(chapterId: string, sceneId: string, patch: Partial<PlanScene>) {
    setChapters((prev) => prev.map((chapter) => (
      chapter.id === chapterId
        ? { ...chapter, blocks: chapter.blocks.map((block) => (block.id === sceneId ? { ...block, ...patch } : block)) }
        : chapter
    )));
  }

  function chooseView(next: PlanView) {
    setView(next);
    startTransition(() => setPlanView(studentId, next));
  }

  function addAct() {
    startTransition(async () => {
      const act = await createAct(bookId);
      setActs((prev) => [...prev, { ...act, subtitle: act.subtitle, content: act.content, status: act.status }]);
    });
  }

  function addChapter(actId?: string | null) {
    startTransition(async () => {
      const { chapter, act } = await createPlanChapter(bookId, actId);
      if (act) setActs((prev) => [...prev, { ...act, subtitle: "", content: "", status: "" }]);
      setChapters((prev) => [...prev, { ...chapter, summary: "", dramaticArgument: "", note: "", images: "", blocks: chapter.blocks }]);
      setOpenId(chapter.id);
    });
  }

  async function removeChapter(chapterId: string) {
    if (!(await siteConfirm("Удалить главу?"))) return;
    setChapters((prev) => prev.filter((chapter) => chapter.id !== chapterId));
    if (openId === chapterId) setOpenId(null);
    startTransition(() => deletePlanChapter(chapterId));
  }

  async function removeAct(actId: string) {
    if (!(await siteConfirm("Удалить акт?"))) return;
    const neighbor = acts.find((act) => act.id !== actId);
    setActs((prev) => prev.filter((act) => act.id !== actId));
    setChapters((prev) => prev.map((chapter) => (
      chapter.actId === actId ? { ...chapter, actId: neighbor?.id ?? null } : chapter
    )));
    startTransition(() => deleteAct(actId));
  }

  function saveNumber(chapterId: string, field: "plannedChars" | "writtenChars", value: number) {
    const next = Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
    patchChapter(chapterId, { [field]: next });
    startTransition(() => updatePlanChapterNumber(chapterId, field, next));
  }

  function addScene(chapterId: string) {
    startTransition(async () => {
      const scene = await createPlanScene(chapterId);
      setChapters((prev) => prev.map((chapter) => (
        chapter.id === chapterId ? { ...chapter, blocks: [...chapter.blocks, scene] } : chapter
      )));
    });
  }

  function removeScene(chapterId: string, sceneId: string) {
    setChapters((prev) => prev.map((chapter) => (
      chapter.id === chapterId ? { ...chapter, blocks: chapter.blocks.filter((block) => block.id !== sceneId) } : chapter
    )));
    startTransition(() => deleteStorylineBlock(sceneId));
  }

  function moveScene(sceneId: string, fromId: string, toId: string) {
    if (fromId === toId) return;
    let moved: PlanScene | undefined;
    setChapters((prev) => prev.map((chapter) => {
      if (chapter.id === fromId) {
        moved = chapter.blocks.find((block) => block.id === sceneId);
        return { ...chapter, blocks: chapter.blocks.filter((block) => block.id !== sceneId) };
      }
      return chapter;
    }));
    if (!moved) return;
    const scene = moved;
    setChapters((prev) => prev.map((chapter) => (
      chapter.id === toId ? { ...chapter, blocks: [...chapter.blocks, scene] } : chapter
    )));
    startTransition(() => movePlanScene(sceneId, toId));
  }

  const columns = loose.length > 0
    ? [...named, { act: { id: "", order: 999, title: "Ещё", subtitle: "", content: "", status: "" }, chapters: loose }]
    : named;

  return (
    <div>
      {banners}
      <PageHeader
        title="План книги"
        actions={
          <>
            {bookSelect}
            <div className="plan-switch" role="tablist" aria-label="Вид плана" style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 999, background: "#F4F4F4" }}>
              {VIEWS.map((item) => {
                const on = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    className={on ? "is-on" : undefined}
                    onClick={() => chooseView(item.id)}
                    style={{
                      border: 0,
                      borderRadius: 999,
                      padding: "7px 14px",
                      background: on ? "#fff" : "transparent",
                      color: on ? "#202020" : "#555",
                      fontWeight: on ? 650 : 500,
                      fontSize: 13.5,
                      fontFamily: SANS,
                      boxShadow: on ? "0 1px 2px rgba(32,32,32,0.08)" : "none",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn-y px-4 text-[14px]" style={{ height: 40, width: "auto" }} onClick={() => addChapter(columns.at(-1)?.act.id || null)}>
              <Plus size={15} /> Глава
            </button>
          </>
        }
      />

      <div className="plan-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <Legend />
        <button type="button" className="chapter-tool" onClick={addAct}>Новый акт</button>
      </div>

      <div key={view} className="panel-fade">
      {chapters.length === 0 && acts.length === 0 ? (
        <EmptyState cue="Глав пока нет" action={
          <button type="button" className="btn-y px-4 text-[14px]" style={{ height: 40, width: "auto" }} onClick={() => addChapter(null)}>
            <Plus size={15} /> Глава
          </button>
        } />
      ) : view === "ribbon" ? (
        <Ribbon columns={columns} numbers={numbers} onOpen={setOpenId} onAdd={addChapter} onDeleteAct={removeAct} actSuggestions={actSuggestions} onActTitle={(id, title) => patchAct(id, { title })} />
      ) : view === "tiles" ? (
        <Tiles columns={columns} numbers={numbers} onOpen={setOpenId} onAdd={addChapter} onDeleteAct={removeAct} actSuggestions={actSuggestions} onActTitle={(id, title) => patchAct(id, { title })} />
      ) : (
        <PlotMap columns={columns} numbers={numbers} onOpen={setOpenId} onMove={moveScene} onAdd={addChapter} />
      )}
      </div>

      {open ? (
        <ChapterSheet
          key={open.id}
          chapter={open}
          number={numbers.get(open.id) ?? 0}
          act={openAct}
          chapters={chapters}
          numbers={numbers}
          suggestions={suggestions}
          actSuggestions={actSuggestions}
          comments={openAct ? comments[openAct.id] ?? [] : []}
          onClose={() => setOpenId(null)}
          onTitle={(title) => patchChapter(open.id, { title })}
          onDescription={(description) => patchChapter(open.id, { description })}
          onNumber={(field, value) => saveNumber(open.id, field, value)}
          onDelete={() => removeChapter(open.id)}
          onAddScene={() => addScene(open.id)}
          onSceneBlur={(sceneId, field, value) => {
            patchScene(open.id, sceneId, { [field]: value });
            startTransition(() => updateStorylineBlockField(sceneId, field, value));
          }}
          onSceneColor={(sceneId, color) => {
            patchScene(open.id, sceneId, { color });
            startTransition(() => updateStorylineBlockColor(sceneId, color));
          }}
          onSceneSpan={(sceneId, span) => {
            const next = Math.max(1, Math.min(8, Math.floor(span) || 1));
            patchScene(open.id, sceneId, { span: next });
            startTransition(() => updateStorylineBlockSpan(sceneId, next));
          }}
          onSceneDelete={(sceneId) => removeScene(open.id, sceneId)}
          onSceneMove={(sceneId, toId) => moveScene(sceneId, open.id, toId)}
          onAct={(field, value) => {
            if (!openAct) return;
            patchAct(openAct.id, { [field]: value });
          }}
          onLegacy={(field, value) => {
            const next = { ...open, [field]: value };
            patchChapter(open.id, { [field]: value, description: foldedDescription(next) });
          }}
        />
      ) : null}
    </div>
  );
}

function ActHead({
  act,
  chapters,
  progress,
  actSuggestions,
  onTitle,
  onDelete,
  onAdd,
}: {
  act: PlanActModel;
  chapters: PlanChapterModel[];
  progress: number;
  actSuggestions: SuggestionMap;
  onTitle: (title: string) => void;
  onDelete: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="plan-act-head" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: 0, flex: "1 1 auto", maxWidth: "100%", marginBottom: 10 }}>
      {act.id ? (
        <SuggestableField
          model="Act"
          recordId={act.id}
          field="title"
          as="input"
          value={act.title}
          suggestion={actSuggestions[act.id]?.title}
          placeholder="Акт"
          className="plan-act-name"
          style={{ fontFamily: SANS, fontWeight: 650, fontSize: 16, border: 0, background: "transparent", display: "block", width: "100%", minWidth: 0, maxWidth: "100%" }}
          onSaved={onTitle}
        />
      ) : (
        <div className="plan-act-name" style={{ fontFamily: SANS, fontWeight: 650, fontSize: 16 }}>Ещё</div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 6, width: "100%", maxWidth: "100%" }}>
        <span className="plan-act-pct">{progress}%</span>
        <ProgressChip chapters={chapters} />
        {act.id ? (
          <button type="button" className="chapter-tool" onClick={onAdd}>Глава</button>
        ) : null}
        {act.id ? (
          <button type="button" className="chapter-tool chapter-tool-icon" onClick={onDelete} aria-label="Удалить акт">
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Ribbon({
  columns,
  numbers,
  onOpen,
  onAdd,
  onDeleteAct,
  actSuggestions,
  onActTitle,
}: {
  columns: { act: PlanActModel; chapters: PlanChapterModel[] }[];
  numbers: Map<string, number>;
  onOpen: (id: string) => void;
  onAdd: (actId: string) => void;
  onDeleteAct: (actId: string) => void;
  actSuggestions: SuggestionMap;
  onActTitle: (id: string, title: string) => void;
}) {
  return (
    <div className="plan-ribbon" style={{ display: "flex", gap: 16, overflowX: "auto", padding: "12px 2px 18px" }}>
      {columns.map(({ act, chapters }) => {
        const progress = percentOf(chapters);
        return (
          <section key={act.id || "loose"} className="plan-act" style={{ minWidth: 220, flex: "1 0 220px" }}>
            <ActHead
              act={act}
              chapters={chapters}
              progress={progress}
              actSuggestions={actSuggestions}
              onTitle={(title) => onActTitle(act.id, title)}
              onDelete={() => onDeleteAct(act.id)}
              onAdd={() => onAdd(act.id)}
            />
            <div className="plan-bars" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {chapters.map((chapter) => {
                const percent = progressPercent(chapter.writtenChars, chapter.plannedChars);
                const kind = kindOf(chapter);
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    className={`plan-bar is-${kind}`}
                    onClick={() => onOpen(chapter.id)}
                    style={{ position: "relative", overflow: "hidden", height: 52, border: 0, borderRadius: 14, textAlign: "left", padding: "0 12px", background: WASH[kind], color: "#202020", cursor: "pointer", fontFamily: SANS }}
                  >
                    <i style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, percent)}%`, background: FILL[kind], opacity: 0.55 }} />
                    <span style={{ position: "relative", display: "flex", alignItems: "center", height: "100%", gap: 8, fontWeight: 650, fontSize: 14 }}>
                      <span>{numbers.get(chapter.id)}</span>
                      <span style={{ fontWeight: 600 }}>{chapter.title || "Глава"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Tiles({
  columns,
  numbers,
  onOpen,
  onAdd,
  onDeleteAct,
  actSuggestions,
  onActTitle,
}: {
  columns: { act: PlanActModel; chapters: PlanChapterModel[] }[];
  numbers: Map<string, number>;
  onOpen: (id: string) => void;
  onAdd: (actId: string) => void;
  onDeleteAct: (actId: string) => void;
  actSuggestions: SuggestionMap;
  onActTitle: (id: string, title: string) => void;
}) {
  return (
    <div className="plan-tiles" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
      {columns.map(({ act, chapters }) => {
        const progress = percentOf(chapters);
        return (
          <section key={act.id || "loose"} className="plan-tile" style={{ border: "1px solid #ececec", borderRadius: 24, padding: 16, background: "#fff", minWidth: 0, overflow: "hidden" }}>
            <div className="plan-tile-top" style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
              <Ring percent={progress} />
              <ActHead
                act={act}
                chapters={chapters}
                progress={progress}
                actSuggestions={actSuggestions}
                onTitle={(title) => onActTitle(act.id, title)}
                onDelete={() => onDeleteAct(act.id)}
                onAdd={() => onAdd(act.id)}
              />
            </div>
            <div className="plan-mosaic" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {chapters.map((chapter) => {
                const kind = kindOf(chapter);
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    className={`plan-chip is-${kind}`}
                    onClick={() => onOpen(chapter.id)}
                    style={{ background: WASH[kind], border: 0, borderRadius: 12, minWidth: 92, maxWidth: 150, padding: "8px 10px", textAlign: "left", cursor: "pointer", color: "#202020", fontFamily: SANS }}
                  >
                    <b style={{ display: "block", fontSize: 12, color: "#8a8a8a", fontWeight: 650 }}>{numbers.get(chapter.id)}</b>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chapter.title || "Глава"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlotMap({
  columns,
  numbers,
  onOpen,
  onMove,
  onAdd,
}: {
  columns: { act: PlanActModel; chapters: PlanChapterModel[] }[];
  numbers: Map<string, number>;
  onOpen: (id: string) => void;
  onMove: (sceneId: string, fromId: string, toId: string) => void;
  onAdd: (actId: string) => void;
}) {
  const flat = columns.flatMap((column) => column.chapters);
  const rows: { key: string; name: string; color: string }[] = [];
  const seen = new Set<string>();
  for (const chapter of flat) {
    for (const block of chapter.blocks) {
      const key = lineKey(block);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ key, name: block.name || "Линия", color: block.color });
    }
  }
  const covered = new Set<string>();

  return (
    <div className="plan-map" style={{ overflowX: "auto", paddingBottom: 12 }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 8, minWidth: "100%" }}>
        <thead>
          <tr>
            <th />
            {columns.map(({ act, chapters: items }) => (
              <th key={act.id || "loose"} colSpan={Math.max(1, items.length)} className="plan-map-act" style={{ color: "#6553E8", fontWeight: 650, fontSize: 13, textAlign: "left", fontFamily: SANS, paddingBottom: 4, verticalAlign: "bottom", whiteSpace: "normal" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, maxWidth: "100%" }}>
                  <span>{act.title || "Акт"}</span>
                  <ProgressChip chapters={items} />
                  {act.id ? (
                    <button type="button" className="chapter-tool" onClick={() => onAdd(act.id)}>Глава</button>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
          <tr>
            <th />
            {flat.map((chapter) => (
              <th key={chapter.id}>
                <button type="button" className={`plan-map-chapter is-${kindOf(chapter)}`} onClick={() => onOpen(chapter.id)} style={{ background: WASH[kindOf(chapter)], border: 0, borderRadius: 12, minWidth: 108, padding: "10px 12px", textAlign: "left", cursor: "pointer", color: "#202020", fontFamily: SANS, display: "block" }}>
                  <b style={{ display: "block", fontSize: 12, color: "#8a8a8a", fontWeight: 650 }}>{numbers.get(chapter.id)}</b>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 650 }}>{chapter.title || "Глава"}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th className="plan-map-line" style={{ color: "#555", fontWeight: 650, fontSize: 13, textAlign: "left", whiteSpace: "nowrap", fontFamily: SANS }}>{row.name}</th>
              {flat.map((chapter) => {
                const token = `${row.key}:${chapter.id}`;
                if (covered.has(token)) return null;
                const block = chapter.blocks.find((item) => lineKey(item) === row.key);
                if (!block) {
                  return (
                    <td
                      key={chapter.id}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const raw = event.dataTransfer.getData("text/plain");
                        const [sceneId, fromId] = raw.split("|");
                        if (sceneId && fromId) onMove(sceneId, fromId, chapter.id);
                      }}
                    />
                  );
                }
                const span = Math.max(1, block.span);
                const start = flat.findIndex((item) => item.id === chapter.id);
                for (let index = 1; index < span && start + index < flat.length; index += 1) {
                  covered.add(`${row.key}:${flat[start + index].id}`);
                }
                const tone = COLOR[block.color] ?? COLOR.pink;
                return (
                  <td key={chapter.id} colSpan={span}>
                    <button
                      type="button"
                      className="plan-scene"
                      draggable
                      style={{ background: tone.bg, color: tone.fg, border: 0, borderRadius: 12, width: "100%", minHeight: 42, padding: "8px 10px", textAlign: "left", fontWeight: 650, fontSize: 13, fontFamily: SANS }}
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", `${block.id}|${chapter.id}`)}
                      onClick={() => onOpen(chapter.id)}
                    >
                      {block.name || "Линия"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="chapter-empty">Сцен пока нет.</p> : null}
    </div>
  );
}

function ChapterSheet(props: {
  chapter: PlanChapterModel;
  number: number;
  act: PlanActModel | null;
  chapters: PlanChapterModel[];
  numbers: Map<string, number>;
  suggestions: SuggestionMap;
  actSuggestions: SuggestionMap;
  comments: Comment[];
  onClose: () => void;
  onTitle: (title: string) => void;
  onDescription: (description: string) => void;
  onNumber: (field: "plannedChars" | "writtenChars", value: number) => void;
  onDelete: () => void;
  onAddScene: () => void;
  onSceneBlur: (sceneId: string, field: "name" | "description", value: string) => void;
  onSceneColor: (sceneId: string, color: StorylineColor) => void;
  onSceneSpan: (sceneId: string, span: number) => void;
  onSceneDelete: (sceneId: string) => void;
  onSceneMove: (sceneId: string, toId: string) => void;
  onAct: (field: "title" | "subtitle" | "content", value: string) => void;
  onLegacy: (field: "summary" | "dramaticArgument" | "note" | "images", value: string) => void;
}) {
  const { chapter, act } = props;
  const chapterSuggestions = props.suggestions[chapter.id] ?? {};
  const legacyFields = (["summary", "dramaticArgument", "note", "images"] as const).filter((field) => chapterSuggestions[field]);
  const legacyLabel: Record<(typeof legacyFields)[number], string> = {
    summary: "Суть",
    dramaticArgument: "Ядро",
    note: "Примечание",
    images: "Образы",
  };

  return (
    <>
      <button type="button" className="plan-sheet-back" aria-label="Закрыть" onClick={props.onClose} />
      <aside className="plan-sheet" role="dialog" aria-label={chapter.title || "Глава"} style={{ position: "fixed", top: 0, right: 0, zIndex: 41, width: "min(440px, 100%)", height: "100dvh", overflow: "auto", background: "#fff", borderLeft: "1px solid #ececec", padding: "22px 22px 48px", fontFamily: SANS }}>
        <div className="plan-sheet-top">
          <span className="chapter-card-n">Глава {props.number}</span>
          <button type="button" className="chapter-tool chapter-tool-icon" onClick={props.onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>
        <SuggestableField
          model="PlanChapter"
          recordId={chapter.id}
          field="title"
          value={chapter.title}
          suggestion={chapterSuggestions.title}
          placeholder="Название"
          className="plan-sheet-title"
          style={{ fontFamily: SANS, fontWeight: 650, fontSize: 28, letterSpacing: "-0.03em", border: 0, width: "100%", background: "transparent", display: "block" }}
          onSaved={props.onTitle}
        />
        <div className="chapter-card-figures plan-sheet-figures" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 4, marginTop: 12, width: "auto", fontVariantNumeric: "tabular-nums", fontFamily: SANS }}>
          <input
            key={`${chapter.id}-w-${chapter.writtenChars}`}
            defaultValue={formatChars(chapter.writtenChars)}
            onBlur={(event) => props.onNumber("writtenChars", parseChars(event.target.value))}
            onKeyDown={blurOnEnter}
            inputMode="numeric"
            aria-label="Написано знаков"
            placeholder="0"
            className="chapter-num"
            size={Math.max(1, formatChars(chapter.writtenChars).length)}
            style={{ width: `${Math.max(1, formatChars(chapter.writtenChars).length)}ch`, fontFamily: SANS, textAlign: "left", padding: 0 }}
          />
          <span aria-hidden="true">/</span>
          <input
            key={`${chapter.id}-p-${chapter.plannedChars}`}
            defaultValue={formatChars(chapter.plannedChars)}
            onBlur={(event) => props.onNumber("plannedChars", parseChars(event.target.value))}
            onKeyDown={blurOnEnter}
            inputMode="numeric"
            aria-label="План знаков"
            placeholder="0"
            className="chapter-num"
            size={Math.max(1, formatChars(chapter.plannedChars).length)}
            style={{ width: `${Math.max(1, formatChars(chapter.plannedChars).length)}ch`, fontFamily: SANS, textAlign: "left", padding: 0 }}
          />
          <span className={`chapter-pct is-${kindOf(chapter)}`}>
            {chapter.plannedChars > 0 ? `${progressPercent(chapter.writtenChars, chapter.plannedChars)}%` : "—"}
          </span>
        </div>
        <SuggestableField
          key={chapter.description}
          model="PlanChapter"
          recordId={chapter.id}
          field="description"
          value={chapter.description}
          suggestion={chapterSuggestions.description}
          placeholder="Описание"
          className="plan-sheet-prose"
          style={{ fontFamily: "var(--font-serif), Literata, Georgia, serif", fontSize: 17, lineHeight: 1.45, border: 0, width: "100%", background: "transparent", display: "block", marginTop: 16 }}
          onSaved={props.onDescription}
        />

        <div className="plan-sheet-block">
          <div className="plan-sheet-label">
            <span>Сцены</span>
            <button type="button" className="chapter-tool" onClick={props.onAddScene}>Добавить</button>
          </div>
          {chapter.blocks.map((block) => {
            const tone = COLOR[block.color] ?? COLOR.pink;
            return (
              <div key={block.id} className="plan-scene-edit" style={{ background: tone.bg }}>
                <input
                  defaultValue={block.name}
                  className="plan-scene-name"
                  aria-label="Название сцены"
                  onBlur={(event) => props.onSceneBlur(block.id, "name", event.target.value)}
                  onKeyDown={blurOnEnter}
                />
                <textarea
                  defaultValue={block.description}
                  className="plan-scene-text"
                  aria-label="Описание сцены"
                  onBlur={(event) => props.onSceneBlur(block.id, "description", event.target.value)}
                />
                <div className="plan-scene-tools">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      aria-label={color.value}
                      className="plan-dot"
                      style={{ background: color.dot, outline: block.color === color.value ? "2px solid var(--ink)" : "none" }}
                      onClick={() => props.onSceneColor(block.id, color.value)}
                    />
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={8}
                    defaultValue={block.span}
                    aria-label="Ширина сцены"
                    className="chapter-num"
                    onBlur={(event) => props.onSceneSpan(block.id, Number(event.target.value))}
                    onKeyDown={blurOnEnter}
                  />
                  <select
                    aria-label="Глава сцены"
                    value={chapter.id}
                    onChange={(event) => props.onSceneMove(block.id, event.target.value)}
                  >
                    {props.chapters.map((item) => (
                      <option key={item.id} value={item.id}>
                        {props.numbers.get(item.id)} {item.title || "Глава"}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="chapter-tool" onClick={() => props.onSceneDelete(block.id)} aria-label="Удалить сцену">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {act ? (
          <details className="plan-fold">
            <summary>Акт</summary>
            <SuggestableField
              model="Act"
              recordId={act.id}
              field="title"
              as="input"
              value={act.title}
              suggestion={props.actSuggestions[act.id]?.title}
              placeholder="Название акта"
              className="plan-fold-title"
              onSaved={(value) => props.onAct("title", value)}
            />
            <SuggestableField
              model="Act"
              recordId={act.id}
              field="subtitle"
              value={act.subtitle}
              suggestion={props.actSuggestions[act.id]?.subtitle}
              placeholder="Подзаголовок"
              className="plan-fold-text"
              onSaved={(value) => props.onAct("subtitle", value)}
            />
            <SuggestableField
              model="Act"
              recordId={act.id}
              field="content"
              value={act.content}
              suggestion={props.actSuggestions[act.id]?.content}
              placeholder="Текст акта"
              className="plan-fold-text"
              onSaved={(value) => props.onAct("content", value)}
            />
          </details>
        ) : null}

        {legacyFields.length > 0 ? (
          <details className="plan-fold" open>
            <summary>Прежние поля</summary>
            {legacyFields.map((field) => (
              <SuggestableField
                key={field}
                model="PlanChapter"
                recordId={chapter.id}
                field={field}
                value={chapter[field]}
                suggestion={chapterSuggestions[field]}
                placeholder={legacyLabel[field]}
                className="plan-fold-text"
                onSaved={(value) => props.onLegacy(field, value)}
              />
            ))}
          </details>
        ) : null}

        {act ? (
          <details className="plan-fold">
            <summary>Комментарии</summary>
            <CommentsBlock model="Act" recordId={act.id} initialComments={props.comments} />
          </details>
        ) : null}

        <button type="button" className="chapter-tool plan-sheet-delete" onClick={props.onDelete}>
          Удалить главу
        </button>
      </aside>
    </>
  );
}
