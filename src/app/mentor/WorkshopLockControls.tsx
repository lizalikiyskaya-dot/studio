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
    <div className="mentor-workshops flex flex-row flex-nowrap items-center gap-1">
      <WorkshopLockButton
        unlocked={bookUnlocked}
        onToggle={() => toggleBookWorkshopLock(userId)}
        labelOn="книга ✓"
        labelOff="книга"
        titleOn="книга открыта"
        titleOff="книга закрыта"
      />
      <WorkshopLockButton
        unlocked={storyUnlocked}
        onToggle={() => toggleStoryWorkshopLock(userId)}
        labelOn="рассказы ✓"
        labelOff="рассказы"
        titleOn="рассказы открыты"
        titleOff="рассказы закрыты"
      />
    </div>
  );
}
