import { blocksToPlain, loadBlocks, type ContentFormat } from "@/features/exercises/additional/richText";

/** Знаки видимого текста, без разметки. Пробелы считаются. */
export function countSigns(content: string, format: ContentFormat) {
  return blocksToPlain(loadBlocks(content, format)).replace(/\r/g, "").length;
}
