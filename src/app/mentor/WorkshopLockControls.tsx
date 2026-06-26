"use client";

import { toggleBookWorkshopLock } from "@/features/bookWorkshopLock/actions";
import { toggleStoryWorkshopLock } from "@/features/storyWorkshopLock/actions";
import WorkshopLockButton from "./WorkshopLockButton";

export default function WorkshopLockControls({
  userId,
  bookUnlocked,
  storyUnlocked,
}: {
  userId: string;
  bookUnlocked: boolean;
  storyUnlocked: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-end">
      <WorkshopLockButton
        unlocked={bookUnlocked}
        onToggle={() => toggleBookWorkshopLock(userId)}
        labelOn="книга открыта"
        labelOff="книга закрыта"
      />
      <WorkshopLockButton
        unlocked={storyUnlocked}
        onToggle={() => toggleStoryWorkshopLock(userId)}
        labelOn="рассказы открыты"
        labelOff="рассказы закрыты"
      />
    </div>
  );
}
