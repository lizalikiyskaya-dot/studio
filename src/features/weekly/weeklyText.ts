import { blocksToPlain, isPlain, loadBlocks, markdownToBlocks, type ContentFormat } from "@/features/exercises/additional/richText";

/** Как редактор рукописи: обычный текст без пометок, иначе разметка. Старые сдачи без пометок остаются текстом. */
export function weeklyFormat(text: string): ContentFormat {
  if (!isPlain(markdownToBlocks(text))) return "markdown";
  return "plain";
}

export function weeklyPlain(text: string): string {
  return blocksToPlain(loadBlocks(text, weeklyFormat(text))).replace(/\r/g, "");
}

export function weeklyExcerpt(text: string, limit = 220): string {
  const plain = weeklyPlain(text).replace(/\s+/g, " ").trim();
  if (plain.length <= limit) return plain;
  return `${plain.slice(0, limit).trimEnd()}…`;
}
