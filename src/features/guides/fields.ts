import type { Prisma } from "@/generated/prisma/client";

/** Одна правка методички. Лишние поля сюда не входят — особенно notifyOnOpen. */
export type GuideFieldUpdate =
  | { title: string }
  | { description: string }
  | { order: number }
  | { notifyOnOpen: boolean }
  | { fileUrl: string; fileName: string; fileMime: string };

/**
 * Данные для prisma.guide.update. Возвращает только то поле, которое правили.
 * Смешанный объект (описание вместе с галочкой письма) — ошибка, а не запись.
 */
export function guideFieldData(update: GuideFieldUpdate): Prisma.GuideUpdateInput {
  const keys = Object.keys(update).sort().join(",");
  if (keys === "title") return { title: (update as { title: string }).title };
  if (keys === "description") return { description: (update as { description: string }).description };
  if (keys === "order") return { order: (update as { order: number }).order };
  if (keys === "notifyOnOpen") return { notifyOnOpen: (update as { notifyOnOpen: boolean }).notifyOnOpen };
  if (keys === "fileMime,fileName,fileUrl") {
    const file = update as { fileUrl: string; fileName: string; fileMime: string };
    return { fileUrl: file.fileUrl, fileName: file.fileName, fileMime: file.fileMime };
  }
  throw new Error("Правка методички должна менять только одно поле");
}
