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
    <div className="flex flex-wrap gap-6 mb-6">
      <ToggleSwitch checked={chars} onChange={handleCharsToggle} label={chars ? "Персонажи: свои для рассказа" : "Персонажи: общие цикла"} />
      <ToggleSwitch checked={setting} onChange={handleSettingToggle} label={setting ? "Сеттинг: свой для рассказа" : "Сеттинг: общий цикла"} />
    </div>
  );
}
