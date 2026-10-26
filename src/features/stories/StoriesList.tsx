"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import type { Story, CycleCharacter, CycleWorldEntry, StoryCharacter, StoryWorldEntry } from "@/generated/prisma/client";
import { createStory, createStandaloneStory, deleteStory, updateStoryChars, updateStoryReview } from "./actions";
import StoryDetail from "./StoryDetail";
import EmptyState from "@/components/EmptyState";
import { useHeaderAction } from "@/components/headerAction";
import Collapse from "@/components/Collapse";
import { blurOnEnter } from "@/lib/blurOnEnter";
import { formatChars, parseChars, progressPercent } from "@/features/acts/chapterText";
import { CHAPTER_REVIEW, chapterTone, type ChapterReviewValue } from "@/features/books/chapterReview";

type CycleSettingSnap = {
  grapesGeography: string;
  grapesReligion: string;
  grapesAchievements: string;
  grapesPolitics: string;
  grapesEconomy: string;
  grapesSocial: string;
  settingPhotoUrl: string | null;
  settingChips: string[];
  settingMapX: number | null;
  settingMapY: number | null;
  settingManifest?: number | null;
  settingFilter?: number | null;
  settingConflict?: number | null;
  settingMagnet?: number | null;
  fantasyGeneral?: string;
  fantasyNotes?: string;
};

const STORY_STATUS: Record<ChapterReviewValue, string> = {
  IN_PROGRESS: "в процессе",
  SUBMITTED: "сдано",
  IN_REVIEW: "на проверке",
  NEEDS_REVISION: "на доработке",
  ACCEPTED: "принято",
};

const TONE_LEGEND = [
  { tone: "progress", label: "в процессе" },
  { tone: "almost", label: "почти написан" },
  { tone: "review", label: "сдано и на проверке" },
  { tone: "revision", label: "на доработке" },
  { tone: "accepted", label: "принято" },
] as const;

function storyMeta(story: Story) {
  const line = story.logline.replace(/\s+/g, " ").trim();
  const short = line.length > 72 ? `${line.slice(0, 72).trim()}…` : line;
  return [story.genre.trim(), short].filter(Boolean).join(" · ");
}

export default function StoriesList({
  cycleId,
  studentId,
  stories,
  cycleCharacters,
  cycleWorldEntries,
  storyCharacters,
  storyWorldEntries,
  cycleSetting,
  headerAdd = false,
  canReview = false,
  showSummary = true,
}: {
  cycleId: string | null;
  studentId: string;
  stories: Story[];
  cycleCharacters: CycleCharacter[];
  cycleWorldEntries: CycleWorldEntry[];
  storyCharacters: StoryCharacter[];
  storyWorldEntries: StoryWorldEntry[];
  cycleSetting?: CycleSettingSnap;
  headerAdd?: boolean;
  canReview?: boolean;
  showSummary?: boolean;
}) {
  const router = useRouter();
  const requested = useSearchParams().get("story");
  const [openId, setOpenId] = useState<string | null>(
    requested && stories.some((story) => story.id === requested) ? requested : null
  );
  const [drafts, setDrafts] = useState<Record<string, Partial<Pick<Story, "writtenChars" | "plannedChars" | "reviewStatus" | "title">>>>({});
  const [, startTransition] = useTransition();

  function view(story: Story): Story {
    return { ...story, ...drafts[story.id] };
  }

  function patch(storyId: string, next: Partial<Pick<Story, "writtenChars" | "plannedChars" | "reviewStatus" | "title">>) {
    setDrafts((prev) => ({ ...prev, [storyId]: { ...prev[storyId], ...next } }));
  }

  function handleAdd() {
    startTransition(async () => {
      const story = cycleId ? await createStory(cycleId) : await createStandaloneStory(studentId);
      setOpenId(story.id);
      router.refresh();
    });
  }
  useHeaderAction(headerAdd ? "story-add" : "story-add-inline", handleAdd);

  async function handleDelete(storyId: string) {
    if (!(await siteConfirm("Удалить рассказ? Это нельзя отменить."))) return;
    startTransition(async () => {
      await deleteStory(storyId);
      if (openId === storyId) setOpenId(null);
      router.refresh();
    });
  }

  if (stories.length === 0) {
    return (
      <EmptyState
        cue="Самое время написать рассказ"
        detail={cycleId ? "Рассказы этого цикла появятся здесь." : "Отдельные рассказы появятся здесь."}
        action={
          headerAdd ? undefined : (
            <button type="button" onClick={handleAdd} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
              <Plus size={16} /> Новый рассказ
            </button>
          )
        }
      />
    );
  }

  const rows = stories.map(view);
  const written = rows.reduce((sum, story) => sum + story.writtenChars, 0);
  const planned = rows.reduce((sum, story) => sum + story.plannedChars, 0);
  const percent = progressPercent(written, planned);

  return (
    <div className="chapter-feed">
      {showSummary ? (
        <>
          <section className="chapter-plaque" aria-label="Сводка по рассказам">
            <div className="chapter-plaque-row">
              <div>
                <div className="chapter-plaque-num">{formatChars(written)}</div>
                <div className="chapter-plaque-lbl">написано знаков</div>
              </div>
              <div>
                <div className="chapter-plaque-num">{formatChars(planned)}</div>
                <div className="chapter-plaque-lbl">в плане</div>
              </div>
              <div className="chapter-plaque-grow">
                <div className="chapter-plaque-num">{percent}%</div>
                <div className="chapter-plaque-lbl">готово</div>
              </div>
            </div>
            <div className="chapter-track" aria-hidden="true">
              <i style={{ width: `${Math.min(100, percent)}%` }} />
            </div>
          </section>
          <div className="chapter-legend" aria-label="Статусы рассказов">
            {TONE_LEGEND.map((item) => (
              <span key={item.tone}>
                <i className={`is-${item.tone}`} />
                {item.label}
              </span>
            ))}
          </div>
        </>
      ) : null}

      <div className="chapter-list story-list">
        {rows.map((story) => {
          const open = story.id === openId;
          const tone = chapterTone(story.reviewStatus, story.writtenChars, story.plannedChars);
          const meta = storyMeta(story);
          const storyPercent = progressPercent(story.writtenChars, story.plannedChars);
          return (
            <article key={story.id} className={`chapter-card story-card is-${tone}${open ? " is-open" : ""}`}>
              <button
                type="button"
                className="story-card-hit"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : story.id)}
              >
                <span className={`story-card-chev chevron-turn${open ? " is-open" : ""}`} aria-hidden="true">
                  <ChevronDown size={18} />
                </span>
                <span className="story-card-title">{story.title.trim() || "Без названия"}</span>
                <span className={`chapter-status story-card-status is-${tone}`}>{STORY_STATUS[story.reviewStatus]}</span>
                <span className="story-card-meta">{meta || "Без жанра"}</span>
                <span className="story-card-chars">
                  {formatChars(story.writtenChars)}
                  {story.plannedChars > 0 ? ` / ${formatChars(story.plannedChars)}` : ""} знаков
                </span>
              </button>
              <Collapse open={open}>
                <div className="story-open">
                  <StoryDetail
                    embedded
                    story={story}
                    cycleCharacters={cycleCharacters}
                    cycleWorldEntries={cycleWorldEntries}
                    storyCharacters={storyCharacters.filter((c) => c.storyId === story.id)}
                    storyWorldEntries={storyWorldEntries.filter((e) => e.storyId === story.id)}
                    cycleSetting={cycleSetting}
                    onDelete={() => handleDelete(story.id)}
                    onTitle={(title) => patch(story.id, { title })}
                  />
                  <aside className="story-status" aria-label="Статус рассказа">
                    <div className="chapter-week-kicker">Статус рассказа</div>
                    <div className="story-status-row">
                      <label>
                        <input
                          key={`${story.id}-w-${story.writtenChars}`}
                          defaultValue={formatChars(story.writtenChars)}
                          onBlur={(event) => {
                            const next = parseChars(event.target.value);
                            patch(story.id, { writtenChars: next });
                            startTransition(() => updateStoryChars(story.id, "writtenChars", next));
                          }}
                          onKeyDown={blurOnEnter}
                          inputMode="numeric"
                          aria-label="Написано знаков"
                          className="chapter-num story-status-num"
                        />
                        <span>написано</span>
                      </label>
                      <label>
                        <input
                          key={`${story.id}-p-${story.plannedChars}`}
                          defaultValue={formatChars(story.plannedChars)}
                          onBlur={(event) => {
                            const next = parseChars(event.target.value);
                            patch(story.id, { plannedChars: next });
                            startTransition(() => updateStoryChars(story.id, "plannedChars", next));
                          }}
                          onKeyDown={blurOnEnter}
                          inputMode="numeric"
                          aria-label="В плане знаков"
                          className="chapter-num story-status-num"
                        />
                        <span>в плане</span>
                      </label>
                      <div>
                        <div className="story-status-num">{story.plannedChars > 0 ? `${storyPercent}%` : "—"}</div>
                        <span>готово</span>
                      </div>
                    </div>
                    <div className="chapter-track" aria-hidden="true">
                      <i style={{ width: `${Math.min(100, storyPercent)}%` }} />
                    </div>
                    {canReview ? (
                      <select
                        className={`chapter-status chapter-status-select is-${tone} story-status-select`}
                        value={story.reviewStatus}
                        aria-label="Статус проверки"
                        onChange={(event) => {
                          const next = event.target.value;
                          if (next === "IN_PROGRESS" || next === "SUBMITTED" || next === "IN_REVIEW" || next === "NEEDS_REVISION" || next === "ACCEPTED") {
                            patch(story.id, { reviewStatus: next });
                            startTransition(() => updateStoryReview(story.id, next));
                          }
                        }}
                      >
                        {CHAPTER_REVIEW.map((item) => (
                          <option key={item.value} value={item.value}>{STORY_STATUS[item.value]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`chapter-status is-${tone}`}>{STORY_STATUS[story.reviewStatus]}</span>
                    )}
                  </aside>
                </div>
              </Collapse>
            </article>
          );
        })}
      </div>

      {!headerAdd && (
        <button type="button" onClick={handleAdd} className="btn-y mt-4 px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
          <Plus size={16} /> Новый рассказ
        </button>
      )}
    </div>
  );
}
