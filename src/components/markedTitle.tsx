import type { ReactNode } from "react";
import Mark from "@/components/Mark";

/** Крупный заголовок: маркер на последнем слове, у однословного — на всём. */
export function markedTitle(title: string): ReactNode {
  const trimmed = title.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return title;
  if (words.length === 1) return <Mark>{trimmed}</Mark>;
  const last = words[words.length - 1];
  return (
    <>
      {words.slice(0, -1).join(" ")} <Mark>{last}</Mark>
    </>
  );
}
