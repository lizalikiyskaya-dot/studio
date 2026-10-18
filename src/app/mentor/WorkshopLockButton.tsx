"use client";

import { useState, useTransition } from "react";
import { Lock, Unlock } from "lucide-react";
import { BadgeButton } from "@/components/ui/Badge";

export default function WorkshopLockButton({
  unlocked: initialUnlocked,
  onToggle,
  labelOn,
  labelOff,
  titleOn,
  titleOff,
}: {
  unlocked: boolean;
  onToggle: () => Promise<boolean>;
  labelOn: string;
  labelOff: string;
  titleOn: string;
  titleOff: string;
}) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [, startTransition] = useTransition();

  function handleToggle() {
    setUnlocked((v) => !v);
    startTransition(() => void onToggle());
  }

  return (
    <BadgeButton onClick={handleToggle} tone={unlocked ? "success" : "danger"} fill={unlocked ? "soft" : "outline"} title={unlocked ? titleOn : titleOff}>
      {unlocked ? <Unlock size={11} /> : <Lock size={11} />}
      {unlocked ? labelOn : labelOff}
    </BadgeButton>
  );
}
