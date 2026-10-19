"use client";

import { useMemo, useState, useTransition } from "react";
import { GripVertical, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import type { Act, ActChapter, Comment, StorylineBlock } from "@/generated/prisma/client";
import {
  createAct,
  createActChapter,
  createStorylineBlock,
  deleteAct,
  deleteActChapter,
  deleteStorylineBlock,
  moveStorylineBlock,
  updateActChapterField,
  updateActField,
  updateStorylineBlockColor,
  updateStorylineBlockField,
  updateStorylineBlockSpan,
  type StorylineColor,
} from "./actions";
import SuggestableField from "@/features/suggestions/SuggestableField";
import CommentsBlock from "@/features/comments/CommentsBlock";
import PageHeader from "@/components/PageHeader";

type ChapterWithBlocks = ActChapter & { blocks: StorylineBlock[] };
type ActWithChapters = Act & { chapters: ChapterWithBlocks[] };
type PlanSlice = { plannedChars: number; writtenChars: number; actBreakAfter: boolean };

const COLORS: { value: StorylineColor; dot: string; bg: string; fg: string }[] = [
  { value: "sage", dot: "#2FB083", bg: "#D5F3E7", fg: "#14684B" },
  { value: "lavender", dot: "#7B6CF6", bg: "#E6E2FF", fg: "#4B3FC0" },
  { value: "ochre", dot: "#F28A3C", bg: "#FFE8D6", fg: "#9A4B12" },
  { value: "blue", dot: "#3B9EDB", bg: "#DDF0FB", fg: "#18638F" },
  { value: "pink", dot: "#E0528A", bg: "#FCE1EC", fg: "#9C2C58" },
];
const COLOR = Object.fromEntries(COLORS.map((c) => [c.value, c])) as Record<string, (typeof COLORS)[number]>;

const STATUS_CYCLE = ["", "ACCEPTED", "IN_PROGRESS", "AHEAD"] as const;
const STATUS_LABEL: Record<string, string> = {
  ACCEPTED: "принят",
  IN_PROGRESS: "в работе",
  AHEAD: "впереди",
};

function lineKey(block: StorylineBlock) {
  const name = block.name.trim().toLowerCase();
  return name ? `${block.color}::${name}` : `id:${block.id}`;
}

function splitProgress(chapters: PlanSlice[], actCount: number) {
  if (actCount === 0) return [];
  const breaks = chapters.reduce<PlanSlice[][]>((groups, chapter) => {
    if (groups.length === 0) groups.push([]);
    groups[groups.length - 1].push(chapter);
    if (chapter.actBreakAfter) groups.push([]);
    return groups;
  }, []);
  const usable = breaks.filter((group) => group.length > 0);
  if (usable.length === actCount) return usable;
  const size = Math.ceil(chapters.length / actCount) || 1;
  return Array.from({ length: actCount }, (_, index) => chapters.slice(index * size, (index + 1) * size));
}

function percent(chapters: PlanSlice[]) {
  const planned = chapters.reduce((sum, chapter) => sum + chapter.plannedChars, 0);
  const written = chapters.reduce((sum, chapter) => sum + chapter.writtenChars, 0);
  if (planned <= 0) return 0;
  return Math.min(100, Math.round((written / planned) * 100));
}

function resolvedStatus(stored: string, progress: number) {
  if (stored === "ACCEPTED" || stored === "IN_PROGRESS" || stored === "AHEAD") return stored;
  if (progress >= 100) return "ACCEPTED";
  if (progress > 0) return "IN_PROGRESS";
  return "AHEAD";
}

export default function BookPlanBoard({
  bookId,
  initialActs,
  suggestions,
  comments,
  planChapters,
  banners,
  bookSelect,
}: {
  bookId: string;
  initialActs: ActWithChapters[];
  suggestions: Record<string, Record<string, string>>;
  comments: Record<string, Comment[]>;
  planChapters: PlanSlice[];
  banners: React.ReactNode;
  bookSelect?: React.ReactNode;
}) {
  const [acts, setActs] = useState(initialActs);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(false);
  const [mobileAct, setMobileAct] = useState(0);
  const [dropColumn, setDropColumn] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const columns = useMemo(
    () => acts.flatMap((act) => act.chapters.map((chapter) => ({ ...chapter, actTitle: act.title }))),
    [acts]
  );
  const columnIndex = useMemo(() => new Map(columns.map((column, index) => [column.id, index])), [columns]);
  const blocks = columns.flatMap((column) => column.blocks);
  const selected = blocks.find((block) => block.id === selectedId) ?? null;

  const lines = useMemo(() => {
    const map = new Map<string, { key: string; name: string; color: string; blocks: StorylineBlock[] }>();
    for (const block of blocks) {
      const key = lineKey(block);
      const row = map.get(key) ?? { key, name: block.name || "Без названия", color: block.color, blocks: [] };
      row.blocks.push(block);
      map.set(key, row);
    }
    return [...map.values()];
  }, [blocks]);

  const groups = splitProgress(planChapters, acts.length);

  function patchBlock(blockId: string, patch: Partial<StorylineBlock>) {
    setActs((prev) =>
      prev.map((act) => ({
        ...act,
        chapters: act.chapters.map((chapter) => ({
          ...chapter,
          blocks: chapter.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
        })),
      }))
    );
  }

  function handleAddAct() {
    startTransition(async () => {
      const act = await createAct(bookId);
      setActs((prev) => [...prev, { ...act, chapters: [] }]);
    });
  }

  function handleDeleteAct(actId: string) {
    if (!window.confirm("Удалить акт?")) return;
    setActs((prev) => prev.filter((act) => act.id !== actId));
    startTransition(() => deleteAct(actId));
  }

  function handleAddChapter() {
    startTransition(async () => {
      const last = acts[acts.length - 1];
      if (!last) {
        const act = await createAct(bookId);
        const chapter = await createActChapter(act.id);
        setActs([{ ...act, chapters: [chapter] }]);
        return;
      }
      const chapter = await createActChapter(last.id);
      setActs((prev) => prev.map((item) => (item.id === last.id ? { ...item, chapters: [...item.chapters, chapter] } : item)));
    });
  }

  function handleAddLine() {
    const chapter = columns[0];
    if (!chapter) return;
    const color = COLORS[lines.length % COLORS.length].value;
    startTransition(async () => {
      const block = await createStorylineBlock(chapter.id);
      await updateStorylineBlockColor(block.id, color);
      await updateStorylineBlockField(block.id, "name", "Новая линия");
      const next = { ...block, color, name: "Новая линия" };
      setActs((prev) =>
        prev.map((act) => ({
          ...act,
          chapters: act.chapters.map((item) => (item.id === chapter.id ? { ...item, blocks: [...item.blocks, next] } : item)),
        }))
      );
      setSelectedId(block.id);
    });
  }

  function handleAddScene(chapterId?: string, name?: string, color?: StorylineColor) {
    const chapter = chapterId ?? columns[0]?.id;
    if (!chapter) return;
    startTransition(async () => {
      const block = await createStorylineBlock(chapter);
      if (color) await updateStorylineBlockColor(block.id, color);
      if (name) await updateStorylineBlockField(block.id, "name", name);
      const next = { ...block, color: color ?? block.color, name: name ?? block.name };
      setActs((prev) =>
        prev.map((act) => ({
          ...act,
          chapters: act.chapters.map((item) => (item.id === chapter ? { ...item, blocks: [...item.blocks, next] } : item)),
        }))
      );
      setSelectedId(block.id);
    });
  }

  function handleDrop(blockId: string, chapterId: string) {
    if (!blockId || !chapterId) return;
    setActs((prev) => {
      let moving: StorylineBlock | undefined;
      const stripped = prev.map((act) => ({
        ...act,
        chapters: act.chapters.map((chapter) => {
          const found = chapter.blocks.find((block) => block.id === blockId);
          if (found) moving = { ...found, chapterId };
          return { ...chapter, blocks: chapter.blocks.filter((block) => block.id !== blockId) };
        }),
      }));
      if (!moving) return prev;
      return stripped.map((act) => ({
        ...act,
        chapters: act.chapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, blocks: [...chapter.blocks, moving!] } : chapter
        ),
      }));
    });
    startTransition(() => moveStorylineBlock(blockId, chapterId));
  }

  function handleField(blockId: string, field: "name" | "description", value: string) {
    const current = blocks.find((block) => block.id === blockId);
    patchBlock(blockId, { [field]: value });
    if (field === "name" && current) {
      const key = lineKey(current);
      for (const block of blocks) {
        if (block.id !== blockId && lineKey(block) === key) {
          patchBlock(block.id, { name: value });
          startTransition(() => updateStorylineBlockField(block.id, "name", value));
        }
      }
    }
    startTransition(() => updateStorylineBlockField(blockId, field, value));
  }

  function handleColor(blockId: string, color: StorylineColor) {
    const current = blocks.find((block) => block.id === blockId);
    if (!current) return;
    const key = lineKey(current);
    for (const block of blocks) {
      if (lineKey(block) === key) {
        patchBlock(block.id, { color });
        startTransition(() => updateStorylineBlockColor(block.id, color));
      }
    }
  }

  const grid = `150px repeat(${Math.max(columns.length, 1)}, minmax(120px, 1fr))`;

  return (
    <div>
      <PageHeader
        title="План книги"
        actions={
          <>
            {bookSelect}
            <button type="button" className="inline-flex items-center gap-2 h-11 px-4 rounded-full text-[14px] font-medium" style={{ background: "var(--soft)" }} onClick={() => setShowLines((v) => !v)}>
              <SlidersHorizontal size={16} /> Линии
            </button>
            <button type="button" className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-[14.5px] font-semibold" style={{ background: "var(--y)" }} onClick={() => handleAddScene(selected?.chapterId, selected?.name, selected?.color as StorylineColor)}>
              <Plus size={16} /> Добавить сцену
            </button>
          </>
        }
      />

      <div className="plan-desktop sheet plan-board p-5 pb-3">
        <div style={{ display: "grid", gridTemplateColumns: grid }}>
          <div />
          {acts.map((act, index) => {
            const progress = percent(groups[index] ?? []);
            const status = resolvedStatus(act.status, progress);
            return (
              <div key={act.id} style={{ gridColumn: `span ${Math.max(act.chapters.length, 1)}` }} className="pr-2 pb-2">
                <div className="text-[13.5px] whitespace-nowrap">
                  <b className="font-semibold">{act.title || `Акт ${index + 1}`}</b>
                  <span style={{ color: "var(--muted)" }}> · {STATUS_LABEL[status]}</span>
                </div>
                <div className="mt-2 h-[5px] rounded-full" style={{ background: "#ECECEC" }}>
                  <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "#202020" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 border-b" style={{ display: "grid", gridTemplateColumns: grid, borderColor: "var(--border)" }}>
          <div />
          {columns.map((column, index) => (
            <div
              key={column.id}
              className="pt-3 pb-2 pl-2"
              style={{
                borderLeft: index ? "1px solid var(--border)" : undefined,
                background: dropColumn === column.id ? "#FFF8D6" : undefined,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDropColumn(column.id);
              }}
              onDragLeave={() => setDropColumn((current) => (current === column.id ? null : current))}
              onDrop={(e) => {
                e.preventDefault();
                setDropColumn(null);
                handleDrop(e.dataTransfer.getData("text/plain"), column.id);
              }}
            >
              <input
                defaultValue={column.title}
                onBlur={(e) => {
                  startTransition(() => updateActChapterField(column.id, "title", e.target.value));
                }}
                className="w-full bg-transparent outline-none text-[12.5px] font-medium"
              />
              <div className="text-[12px] truncate" style={{ color: "var(--muted)" }}>{column.description || column.actTitle}</div>
            </div>
          ))}
        </div>

        <div className="mt-2">
          {lines.map((line) => {
            const palette = COLOR[line.color] ?? COLORS[0];
            return (
              <div key={line.key} className="py-1" style={{ display: "grid", gridTemplateColumns: grid, alignItems: "center" }}>
                <div className="flex items-center gap-2 text-[14px] font-medium pr-2">
                  <GripVertical size={14} style={{ color: "#C4C4C4" }} />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: palette.dot }} />
                  <span className="truncate">{line.name}</span>
                </div>
                {line.blocks.map((block) => {
                  const start = (columnIndex.get(block.chapterId) ?? 0) + 2;
                  const span = Math.max(1, block.span || 1);
                  const active = block.id === selectedId;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", block.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => setSelectedId(block.id)}
                      className="mx-0.5 h-10 rounded-[10px] px-3 text-left text-[13px] truncate"
                      style={{
                        gridColumn: `${start} / span ${span}`,
                        background: palette.bg,
                        color: palette.fg,
                        boxShadow: active ? "0 0 0 2px #202020" : undefined,
                      }}
                    >
                      {block.name || "сцена"}
                    </button>
                  );
                })}
                {columns[0] && (
                  <button
                    type="button"
                    onClick={() => handleAddScene(columns[Math.min(columns.length - 1, line.blocks.length)]?.id ?? columns[0].id, line.name, line.color as StorylineColor)}
                    className="mx-0.5 h-10 rounded-[10px] text-[13px]"
                    style={{ border: `1.5px dashed ${palette.dot}`, color: palette.fg, background: "#fff" }}
                  >
                    + сцена
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-5 text-[13.5px]" style={{ color: "var(--muted)" }}>
          <button type="button" className="inline-flex items-center gap-1.5" onClick={handleAddLine}><Plus size={14} /> Новая линия</button>
          <button type="button" className="inline-flex items-center gap-1.5" onClick={handleAddChapter}><Plus size={14} /> Глава</button>
          <span className="ml-auto">сцены перетаскиваются между главами</span>
        </div>
        <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: grid }}>
          <div />
          {columns.map((column) => (
            <div
              key={`zone-${column.id}`}
              className="h-8 rounded-[14px]"
              style={{ background: dropColumn === column.id ? "#FFF8D6" : "transparent" }}
              title={`Перенести в «${column.title || "главу"}»`}
              onDragOver={(e) => {
                e.preventDefault();
                setDropColumn(column.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDropColumn(null);
                handleDrop(e.dataTransfer.getData("text/plain"), column.id);
              }}
            />
          ))}
        </div>
      </div>

      <div className="plan-mobile">
        <div className="seg mb-3 w-full" style={{ display: "flex" }}>
          {acts.map((act, index) => (
            <button
              key={act.id}
              type="button"
              className="flex-1 text-center text-[13.5px]"
              style={{
                background: mobileAct === index ? "#fff" : "transparent",
                fontWeight: mobileAct === index ? 600 : 400,
                borderRadius: 999,
                padding: "7px 8px",
              }}
              onClick={() => setMobileAct(index)}
            >
              {act.title || `Акт ${index + 1}`}
            </button>
          ))}
          {acts.length === 0 && <span className="px-3 py-2 text-[13px]" style={{ color: "var(--muted)" }}>Актов пока нет</span>}
        </div>
        {acts[mobileAct] && (
          <div className="rounded-[18px] px-4 py-3 mb-3" style={{ background: "#E6ECFF" }}>
            <div className="text-[14px] font-semibold">
              {acts[mobileAct].title || `Акт ${mobileAct + 1}`}
              {acts[mobileAct].subtitle ? <span className="font-normal" style={{ color: "var(--ink2)" }}> · {acts[mobileAct].subtitle}</span> : null}
            </div>
            {acts[mobileAct].content ? <div className="text-[13px] mt-0.5" style={{ color: "var(--ink2)" }}>{acts[mobileAct].content}</div> : null}
          </div>
        )}
        <div className="mb-3 flex gap-1.5 overflow-auto">
          {lines.map((line) => {
            const palette = COLOR[line.color] ?? COLORS[0];
            return (
              <span key={line.key} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px]" style={{ background: "var(--soft)" }}>
                <span className="h-2 w-2 rounded-full" style={{ background: palette.dot }} />
                {line.name}
              </span>
            );
          })}
        </div>
        <div className="space-y-2.5">
          {(acts[mobileAct]?.chapters ?? []).map((chapter) => (
            <div key={chapter.id} className="rounded-[22px] border p-4" style={{ borderColor: "var(--border)" }}>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>{chapter.title || "Глава"}</div>
              <div className="text-[16px] font-semibold mt-0.5">{chapter.description || chapter.title || "Глава"}</div>
              <div className="mt-3 space-y-1.5">
                {chapter.blocks.map((block) => {
                  const palette = COLOR[block.color] ?? COLORS[0];
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setSelectedId(block.id)}
                      className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[13px] font-medium"
                      style={{ background: palette.bg, color: palette.fg }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: palette.dot }} />
                      {block.name || "сцена"}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="mt-2 text-[12.5px]" style={{ color: "var(--muted)" }} onClick={() => handleAddScene(chapter.id)}>
                + блок линии
              </button>
            </div>
          ))}
        </div>
      </div>

      {showLines && (
        <div className="mt-3 flex flex-wrap gap-2">
          {lines.map((line) => (
            <span key={line.key} className="rounded-full px-3 py-1 text-[13px]" style={{ background: (COLOR[line.color] ?? COLORS[0]).bg, color: (COLOR[line.color] ?? COLORS[0]).fg }}>
              {line.name}
            </span>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-3 rounded-[20px] border px-5 py-4 flex flex-wrap items-start gap-6" style={{ borderColor: "var(--border)", background: "var(--soft)" }}>
          <div className="w-[180px]">
            <div className="text-[12px]" style={{ color: "var(--muted)" }}>Сцена</div>
            <div className="serif text-[20px] font-medium">{selected.name || "Без названия"}</div>
          </div>
          <div>
            <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>Цвет линии</div>
            <div className="mt-2 flex gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="h-6 w-6 rounded-full"
                  style={{ background: color.dot, boxShadow: selected.color === color.value ? "0 0 0 2px #fff, 0 0 0 4px #202020" : undefined }}
                  onClick={() => handleColor(selected.id, color.value)}
                />
              ))}
            </div>
          </div>
          <label className="w-[160px] text-[12.5px]" style={{ color: "var(--muted)" }}>
            Название линии
            <input
              defaultValue={selected.name}
              key={selected.id + selected.name}
              onBlur={(e) => handleField(selected.id, "name", e.target.value)}
              className="fld mt-1.5 !h-10"
            />
          </label>
          <label className="flex-1 min-w-[200px] text-[12.5px]" style={{ color: "var(--muted)" }}>
            Описание сюжетной линии
            <textarea
              defaultValue={selected.description}
              key={selected.id + "d"}
              onBlur={(e) => handleField(selected.id, "description", e.target.value)}
              className="fld mt-1.5"
              rows={2}
            />
          </label>
          <label className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            Глав
            <input
              type="number"
              min={1}
              max={8}
              defaultValue={selected.span || 1}
              key={selected.id + "s"}
              onBlur={(e) => {
                const span = Number(e.target.value) || 1;
                patchBlock(selected.id, { span });
                startTransition(() => updateStorylineBlockSpan(selected.id, span));
              }}
              className="fld mt-1.5 !h-10 w-16"
            />
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[13px] pt-6"
            style={{ color: "#D9481C" }}
            onClick={() => {
              if (!window.confirm("Удалить сцену?")) return;
              setSelectedId(null);
              setActs((prev) => prev.map((act) => ({ ...act, chapters: act.chapters.map((chapter) => ({ ...chapter, blocks: chapter.blocks.filter((block) => block.id !== selected.id) })) })));
              startTransition(() => deleteStorylineBlock(selected.id));
            }}
          >
            <Trash2 size={14} /> удалить
          </button>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <span className="text-[20px] font-semibold">Акты</span>
        <span className="text-[13px]" style={{ color: "var(--muted)" }}>название, подзаголовок и общее описание</span>
        <button type="button" className="ml-auto inline-flex items-center gap-1 h-9 px-3 rounded-full border text-[13.5px]" style={{ borderColor: "var(--border)" }} onClick={handleAddAct}>
          <Plus size={14} /> Акт
        </button>
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {acts.map((act, index) => {
          const progress = percent(groups[index] ?? []);
          const status = resolvedStatus(act.status, progress);
          const tint = status === "ACCEPTED" ? "#E3F6EF" : status === "IN_PROGRESS" ? "#E6ECFF" : "#F4F4F2";
          const first = act.chapters[0]?.title;
          const last = act.chapters[act.chapters.length - 1]?.title;
          return (
            <div key={act.id} className="rounded-[20px] p-5" style={{ background: tint }}>
              <div className="flex items-center gap-2">
                <SuggestableField model="Act" recordId={act.id} field="title" value={act.title} suggestion={suggestions[act.id]?.title} as="input" className="serif flex-1 bg-transparent outline-none text-[17px] font-medium" placeholder="Название акта" />
                <button
                  type="button"
                  className="rounded-full bg-white/70 px-2 py-0.5 text-[11.5px]"
                  onClick={() => {
                    const current = STATUS_CYCLE.indexOf((act.status || "") as (typeof STATUS_CYCLE)[number]);
                    const next = STATUS_CYCLE[(current + 1) % STATUS_CYCLE.length];
                    setActs((prev) => prev.map((item) => (item.id === act.id ? { ...item, status: next } : item)));
                    startTransition(() => updateActField(act.id, "status", next));
                  }}
                >
                  {STATUS_LABEL[status]}
                </button>
                <button type="button" onClick={() => handleDeleteAct(act.id)} style={{ color: "var(--muted)" }} title="Удалить акт"><Trash2 size={14} /></button>
              </div>
              <SuggestableField model="Act" recordId={act.id} field="subtitle" value={act.subtitle} suggestion={suggestions[act.id]?.subtitle} as="input" className="mt-1 w-full bg-transparent outline-none text-[12.5px]" style={{ color: "var(--muted)" }} placeholder="завязка / развитие / развязка" />
              <SuggestableField model="Act" recordId={act.id} field="content" value={act.content} suggestion={suggestions[act.id]?.content} className="mt-2 w-full bg-transparent outline-none text-[14px] leading-snug" placeholder="Общее описание акта" />
              <div className="mt-3 text-[12.5px]" style={{ color: "var(--muted)" }}>
                {act.chapters.length ? `${first}${last && last !== first ? ` – ${last}` : ""}` : "глав пока нет"}
              </div>
              <div className="mt-2 flex gap-2">
                <button type="button" className="text-[12.5px]" style={{ color: "var(--vi)" }} onClick={() => startTransition(async () => {
                  const chapter = await createActChapter(act.id);
                  setActs((prev) => prev.map((item) => (item.id === act.id ? { ...item, chapters: [...item.chapters, chapter] } : item)));
                })}>+ глава</button>
                {act.chapters[0] && (
                  <button type="button" className="text-[12.5px]" style={{ color: "var(--muted)" }} onClick={() => {
                    const chapter = act.chapters[act.chapters.length - 1];
                    if (!window.confirm("Удалить последнюю главу акта?")) return;
                    setActs((prev) => prev.map((item) => item.id === act.id ? { ...item, chapters: item.chapters.filter((row) => row.id !== chapter.id) } : item));
                    startTransition(() => deleteActChapter(chapter.id));
                  }}>убрать главу</button>
                )}
              </div>
              <div className="mt-3">
                <CommentsBlock model="Act" recordId={act.id} initialComments={comments[act.id] ?? []} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5">{banners}</div>
    </div>
  );
}
