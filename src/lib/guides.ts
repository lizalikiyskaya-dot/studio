import { Prisma } from "@/generated/prisma/client";
import { withStatementTimeout } from "@/lib/dbBudget";
import { prisma } from "@/lib/prisma";
import type { CabinetGuide, LibraryGuide, OpenedStudent } from "@/features/guides/types";

/**
 * Текущие ученики для «показать всем»: с открытым доступом и с закрытым.
 * Заявки (PENDING) и отклонённые сюда не входят — их открывают точечно, в кабинете.
 * Кто появится после этой кнопки, методичку не видит, пока её не откроют отдельно.
 */
export const GUIDE_AUDIENCE = {
  role: "STUDENT" as const,
  status: { in: ["APPROVED" as const, "SUSPENDED" as const] },
};

let schemaReady: true | null = null;

export function forgetGuidesSchema() {
  schemaReady = null;
}

function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === "P2021" || code === "P2022";
}

/** Таблицы библиотеки есть и в них нужные колонки. Пока нет — экраны живут по-старому. */
export async function guidesSchemaReady(): Promise<boolean> {
  if (schemaReady === true) return true;
  try {
    const rows = await prisma.$queryRaw<Array<{ ok: boolean | null }>>`
      SELECT (
        to_regclass('public."Guide"') IS NOT NULL
        AND to_regclass('public."GuideAccess"') IS NOT NULL
        AND to_regclass('public."GuideProgress"') IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Guide' AND column_name = 'description'
        )
        AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Guide' AND column_name = 'fileMime'
        )
        AND EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Guide' AND column_name = 'notifyOnOpen'
        )
      ) AS ok
    `;
    const ok = rows[0]?.ok === true;
    if (ok) schemaReady = true;
    return ok;
  } catch (error) {
    console.error("[guides] не удалось проверить таблицы библиотеки", error);
    return false;
  }
}

function mapMissing<T>(error: unknown, fallback: T): T | undefined {
  if (!isMissingSchemaError(error)) return undefined;
  forgetGuidesSchema();
  return fallback;
}

const guideListSelect = {
  id: true,
  title: true,
  description: true,
  fileName: true,
  fileMime: true,
  order: true,
} as const;

export function sortOpenedStudents(students: OpenedStudent[]): OpenedStudent[] {
  return [...students].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export async function guideByteSizes(ids: string[]): Promise<Map<string, number | null>> {
  const sizes = new Map<string, number | null>();
  if (ids.length === 0) return sizes;
  try {
    const rows = await withStatementTimeout("guide-bytes", 2000, (tx) =>
      tx.$queryRaw<Array<{ id: string; bytes: number | null }>>`
        SELECT id,
          CASE
            WHEN "fileUrl" IS NULL OR position(';base64,' IN "fileUrl") = 0 THEN NULL
            ELSE LEAST(2000000000, GREATEST(1, ((octet_length("fileUrl") - position(';base64,' IN "fileUrl") - 7) * 3 / 4)))::int
          END AS bytes
        FROM "Guide"
        WHERE id IN (${Prisma.join(ids)})
      `,
    );
    for (const row of rows) sizes.set(row.id, row.bytes);
  } catch (error) {
    console.error("[guides] не удалось посчитать размер файлов", error);
  }
  return sizes;
}

function toLibraryGuide(
  guide: {
    id: string;
    title: string;
    description: string;
    fileName: string | null;
    fileMime: string | null;
    order: number;
    starPrice?: number | null;
    access: { student: OpenedStudent }[];
  },
  fileBytes: number | null
): LibraryGuide {
  const openedStudents = sortOpenedStudents(guide.access.map((row) => row.student));
  return {
    id: guide.id,
    title: guide.title,
    description: guide.description,
    fileName: guide.fileName,
    fileMime: guide.fileMime,
    fileBytes,
    hasFile: Boolean(guide.fileName),
    isPdf: guide.fileMime === "application/pdf",
    order: guide.order,
    starPrice: guide.starPrice ?? null,
    visibleCount: openedStudents.length,
    openedStudents,
  };
}

export async function loadLibrary(): Promise<{ ready: true; guides: LibraryGuide[]; studentCount: number } | { ready: false }> {
  if (!(await guidesSchemaReady())) return { ready: false };
  try {
    const accessSelect = {
      where: { visible: true },
      select: { student: { select: { id: true, name: true } } },
    } as const;
    const [guides, studentCount] = await Promise.all([
      prisma.guide
        .findMany({
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: { ...guideListSelect, starPrice: true, access: accessSelect },
        })
        .catch(async (error: unknown) => {
          if (!isMissingSchemaError(error)) throw error;
          const rows = await prisma.guide.findMany({
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            select: { ...guideListSelect, access: accessSelect },
          });
          return rows.map((row) => ({ ...row, starPrice: null as number | null }));
        }),
      prisma.user.count({ where: GUIDE_AUDIENCE }),
    ]);
    const sizes = await guideByteSizes(guides.map((guide) => guide.id));
    return { ready: true, studentCount, guides: guides.map((guide) => toLibraryGuide(guide, sizes.get(guide.id) ?? null)) };
  } catch (error) {
    const fallback = mapMissing(error, { ready: false as const });
    if (fallback) return fallback;
    throw error;
  }
}

/**
 * Методички в кабинете ученика.
 * Наставник видит все, включая скрытые. Ученик — только открытые.
 * Содержимое файла в ответ не кладём: скачивание идёт через API, там проверка повторяется.
 */
export async function loadCabinetGuides(studentId: string, includeHidden: boolean): Promise<CabinetGuide[]> {
  if (!(await guidesSchemaReady())) return [];
  try {
    const guides = await prisma.guide.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        fileMime: true,
        access: { where: { studentId }, select: { visible: true } },
        progress: { where: { studentId }, select: { status: true } },
      },
    });
    const sizes = await guideByteSizes(guides.map((guide) => guide.id));
    const rows: CabinetGuide[] = guides.map((guide) => ({
      id: guide.id,
      title: guide.title,
      description: guide.description,
      fileName: guide.fileName,
      fileMime: guide.fileMime,
      fileBytes: sizes.get(guide.id) ?? null,
      hasFile: Boolean(guide.fileName),
      isPdf: guide.fileMime === "application/pdf",
      visible: guide.access[0]?.visible ?? false,
      status: guide.progress[0]?.status ?? "UNREAD",
    }));
    return includeHidden ? rows : rows.filter((guide) => guide.visible);
  } catch (error) {
    const fallback = mapMissing(error, [] as CabinetGuide[]);
    if (fallback) return fallback;
    throw error;
  }
}

/** Кто уже видит методичку. Имена, без почты. */
export async function listOpenedStudents(guideId: string): Promise<OpenedStudent[]> {
  const rows = await prisma.guideAccess.findMany({
    where: { guideId, visible: true },
    select: { student: { select: { id: true, name: true } } },
  });
  return sortOpenedStudents(rows.map((row) => row.student));
}
