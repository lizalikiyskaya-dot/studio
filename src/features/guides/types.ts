import type { MaterialStatus } from "@/generated/prisma/client";

/** Ученик, у которого методичка уже открыта. */
export type OpenedStudent = {
  id: string;
  name: string;
};

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
  visibleCount: number;
  openedStudents: OpenedStudent[];
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

export type ActionFail = { ok: false; error: string };
export type ActionResult<T extends object | undefined = undefined> = T extends undefined
  ? { ok: true } | ActionFail
  : ({ ok: true } & T) | ActionFail;
