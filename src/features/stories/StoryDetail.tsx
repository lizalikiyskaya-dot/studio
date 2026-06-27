"use client";

import { useTransition } from "react";
import type {
  Story,
  CycleCharacter,
  CycleWorldEntry,
  StoryCharacter,
  StoryWorldEntry,
} from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { updateStoryTitle, updateStoryStructureField, type StoryStructureField } from "./actions";
import StorySourceToggle from "./StorySourceToggle";
import StoryCharactersSection from "@/features/storyCharacters/StoryCharactersSection";
import StorySettingSection from "@/features/storySetting/StorySettingSection";
import { Button } from "@/components/ui/Button";

function StructureField({
  label,
  value,
  field,
  storyId,
}: {
  label: string;
  value: string;
  field: StoryStructureField;
  storyId: string;
}) {
  const [, startTransition] = useTransition();
  return (
    <div className="mb-5 max-w-[680px]">
      <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
        {label}
      </label>
      <AutoGrowTextarea
        defaultValue={value}
        onBlur={(v) => startTransition(() => updateStoryStructureField(storyId, field, v))}
        style={{ borderColor: "var(--rule)", minHeight: 60 }}
        className="w-full border-b py-1.5 text-[14px] outline-none bg-transparent"
      />
    </div>
  );
}

export default function StoryDetail({
  story,
  cycleCharacters,
  cycleWorldEntries,
  storyCharacters,
  storyWorldEntries,
  onDelete,
}: {
  story: Story;
  cycleCharacters: CycleCharacter[];
  cycleWorldEntries: CycleWorldEntry[];
  storyCharacters: StoryCharacter[];
  storyWorldEntries: StoryWorldEntry[];
  onDelete: () => void;
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="rounded-md p-5" style={{ border: "1px solid var(--rule)" }}>
      <div className="flex items-center justify-between mb-5 gap-3">
        <input
          defaultValue={story.title}
          onBlur={(e) => startTransition(() => updateStoryTitle(story.id, e.target.value))}
          className="text-[18px] font-semibold outline-none bg-transparent flex-1"
        />
        <Button onClick={onDelete} variant="secondary" size="sm" className="whitespace-nowrap">
          Удалить рассказ
        </Button>
      </div>

      <StorySourceToggle
        storyId={story.id}
        characterSource={story.characterSource}
        settingSource={story.settingSource}
      />

      <StructureField label="Завязка" value={story.setupText} field="setupText" storyId={story.id} />
      <StructureField label="Кульминация" value={story.climaxText} field="climaxText" storyId={story.id} />
      <StructureField label="Развязка" value={story.resolutionText} field="resolutionText" storyId={story.id} />
      <StructureField
        label="Путь персонажа (кратко)"
        value={story.characterPathText}
        field="characterPathText"
        storyId={story.id}
      />

      <div className="h-px my-6" style={{ background: "var(--rule)" }} />
      <StoryCharactersSection
        story={story}
        cycleCharacters={cycleCharacters}
        storyCharacters={storyCharacters}
      />

      <div className="h-px my-6" style={{ background: "var(--rule)" }} />
      <StorySettingSection
        story={story}
        cycleWorldEntries={cycleWorldEntries}
        storyWorldEntries={storyWorldEntries}
      />
    </div>
  );
}
