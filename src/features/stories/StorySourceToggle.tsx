"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ToggleSwitch from "@/components/ToggleSwitch";
import { setStoryCharacterSource, setStorySettingSource } from "./actions";
import type { CharacterSource, SettingSource } from "@/generated/prisma/client";

export default function StorySourceToggle({
  storyId,
  characterSource,
  settingSource,
}: {
  storyId: string;
  characterSource: CharacterSource;
  settingSource: SettingSource;
}) {
  const router = useRouter();
  const [chars, setChars] = useState(characterSource === "OWN");
  const [setting, setSetting] = useState(settingSource === "OWN");
  const [, startTransition] = useTransition();

  function handleCharsToggle(checked: boolean) {
    setChars(checked);
    startTransition(async () => {
      await setStoryCharacterSource(storyId, checked ? "OWN" : "SHARED");
      router.refresh();
    });
  }

  function handleSettingToggle(checked: boolean) {
    setSetting(checked);
    startTransition(async () => {
      await setStorySettingSource(storyId, checked ? "OWN" : "SHARED");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <div className="px-3 py-2 rounded-full" style={{ background: "#fff", border: "1px solid var(--rule)" }}>
        <ToggleSwitch checked={chars} onChange={handleCharsToggle} label="Общие персонажи" />
      </div>
      <div className="px-3 py-2 rounded-full" style={{ background: "#fff", border: "1px solid var(--rule)" }}>
        <ToggleSwitch checked={setting} onChange={handleSettingToggle} label="Общий сеттинг" />
      </div>
    </div>
  );
}
