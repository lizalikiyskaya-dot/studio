"use client";

import type { Story } from "@/generated/prisma/client";
import SettingMixPanel from "@/features/setting/SettingMixPanel";
import { resolveShares } from "@/features/setting/settingMix";
import { saveStorySettingMix } from "./actions";

export default function StorySettingTypeSection({ story }: { story: Story }) {
  return (
    <SettingMixPanel
      initial={resolveShares(story)}
      actions={{
        save: (shares) => saveStorySettingMix(story.id, shares),
        accept: async () => {},
        reject: async () => {},
      }}
    />
  );
}
