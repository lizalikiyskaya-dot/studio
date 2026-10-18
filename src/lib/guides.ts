import { prisma } from "@/lib/prisma";
import type { CabinetGuide, LibraryGuide, ReaderGuide } from "@/features/guides/types";

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
  notifyOnOpen: true,
} as const;

function toLibraryGuide(
  guide: {
    id: string;
    title: string;
    description: string;
    fileName: string | null;
    fileMime: string | null;
    order: number;
    notifyOnOpen: boolean;
    _count: { access: number };
  }
): LibraryGuide {
  return {
    id: guide.id,
    title: guide.title,
    description: guide.description,
    fileName: guide.fileName,
    hasFile: Boolean(guide.fileName),
    isPdf: guide.fileMime === "application/pdf",
    order: guide.order,
    notifyOnOpen: guide.notifyOnOpen,
    visibleCount: guide._count.access,
  };
}

export async function loadLibrary(): Promise<{ ready: true; guides: LibraryGuide[]; studentCount: number } | { ready: false }> {
  if (!(await guidesSchemaReady())) return { ready: false };
  try {
    const [guides, studentCount] = await Promise.all([
      prisma.guide.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          ...guideListSelect,
          _count: { select: { access: { where: { visible: true } } } },
        },
      }),
      prisma.user.count({ where: GUIDE_AUDIENCE }),
    ]);
    return { ready: true, studentCount, guides: guides.map(toLibraryGuide) };
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
    const rows: CabinetGuide[] = guides.map((guide) => ({
      id: guide.id,
      title: guide.title,
      description: guide.description,
      fileName: guide.fileName,
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

export async function loadGuideForReader(
  guideId: string,
  viewer: { userId: string; asMentor: boolean }
): Promise<ReaderGuide | null> {
  if (!(await guidesSchemaReady())) return null;
  try {
    const guide = await prisma.guide.findUnique({
      where: { id: guideId },
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        fileMime: true,
        access: { where: { studentId: viewer.userId, visible: true }, select: { visible: true } },
      },
    });
    if (!guide) return null;
    if (!viewer.asMentor && guide.access.length === 0) return null;
    return {
      id: guide.id,
      title: guide.title,
      description: guide.description,
      fileName: guide.fileName,
      hasFile: Boolean(guide.fileName),
      isPdf: guide.fileMime === "application/pdf",
    };
  } catch (error) {
    const fallback = mapMissing<ReaderGuide | null>(error, null);
    if (fallback !== undefined) return fallback;
    throw error;
  }
}
