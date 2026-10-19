import type { MaterialStatus } from "@/generated/prisma/client";

/** Карточка в библиотеке наставника. Самого файла здесь нет — только имя. */
export type LibraryGuide = {
  id: string;
  title: string;
  description: string;
  fileName: string | null;
  fileMime: string | null;
  fileBytes: number | null;
  hasFile: boolean;
  isPdf: boolean;
  order: number;
  notifyOnOpen: boolean;
  visibleCount: number;
};

/** Методичка в кабинете конкретного ученика. Файл отдаёт только API. */
export type CabinetGuide = {
  id: string;
  title: string;
  description: string;
  fileName: string | null;
  fileMime: string | null;
  fileBytes: number | null;
  hasFile: boolean;
  isPdf: boolean;
  visible: boolean;
  status: MaterialStatus;
};

/** Страница просмотра. Без содержимого файла. */
export type ReaderGuide = {
  id: string;
  title: string;
  description: string;
  fileName: string | null;
  hasFile: boolean;
  isPdf: boolean;
};

export type ActionFail = { ok: false; error: string };
export type ActionResult<T extends object | undefined = undefined> = T extends undefined
  ? { ok: true } | ActionFail
  : ({ ok: true } & T) | ActionFail;
