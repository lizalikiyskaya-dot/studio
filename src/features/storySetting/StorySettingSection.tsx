"use client";

import type { Story, CycleWorldEntry, StoryWorldEntry } from "@/generated/prisma/client";
import WorldEntryGrid from "./WorldEntryGrid";
import {
  createStoryWorldEntry,
  deleteStoryWorldEntry,
  updateStoryWorldEntryTitle,
  updateStoryWorldEntryBody,
} from "./actions";

export default function StorySettingSection({
  story,
  cycleWorldEntries,
  storyWorldEntries,
}: {
  story: Story;
  cycleWorldEntries: CycleWorldEntry[];
  storyWorldEntries: StoryWorldEntry[];
}) {
  if (story.settingSource === "SHARED") {
    return (
      <div>
        <h3 className="text-[14px] font-semibold mb-3">Сеттинг</h3>
        <p className="text-[12.5px] mb-3" style={{ color: "var(--faded)" }}>
          Используется сеттинг цикла. Чтобы завести свой для этого рассказа — переключите тумблер выше.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {cycleWorldEntries.length === 0 && (
            <span className="text-[13px]" style={{ color: "var(--faded)" }}>
              В цикле пока нет записей сеттинга.
            </span>
          )}
          {cycleWorldEntries.map((e) => (
            <span key={e.id} className="text-[13px] px-3 py-1.5 rounded-sm" style={{ border: "1px solid var(--rule)" }}>
              {e.title}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-[14px] font-semibold mb-3">Сеттинг рассказа</h3>
      <WorldEntryGrid
        entries={storyWorldEntries}
        uploadTarget="story-world-entry-photo"
        onCreate={(category) => createStoryWorldEntry(story.id, category)}
        onDelete={deleteStoryWorldEntry}
        onUpdateTitle={updateStoryWorldEntryTitle}
        onUpdateBody={updateStoryWorldEntryBody}
      />
    </div>
  );
}
