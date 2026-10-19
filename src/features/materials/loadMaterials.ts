import { prisma } from "@/lib/prisma";
import { withStatementTimeout } from "@/lib/dbBudget";
import { MATERIAL_PAGE_SELECT, materialRow, type MaterialRow } from "./materialFile";

type Presence = { id: string; pdf: boolean; epub: boolean; file: boolean };
type Sizes = { id: string; pdf: number | null; epub: number | null; file: number | null };

/**
 * Список материалов без тел файлов. PDF и EPUB лежат в базе как data: URI
 * и раньше уезжали в ответ страницы целиком — кабинет висел на сером плейсхолдере.
 * Размер считаем в Postgres и не тащим байты в Node. Если подсчёт не успел, список всё равно открывается.
 */
export async function loadStudentMaterials(studentId: string): Promise<MaterialRow[]> {
  const started = Date.now();
  const [materials, presence] = await Promise.all([
    prisma.material.findMany({
      where: { studentId },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: MATERIAL_PAGE_SELECT,
    }),
    prisma.$queryRaw<Presence[]>`
      SELECT id,
        ("pdfUrl" IS NOT NULL) AS pdf,
        ("epubUrl" IS NOT NULL) AS epub,
        ("fileUrl" IS NOT NULL) AS file
      FROM "Material"
      WHERE "studentId" = ${studentId}
    `,
  ]);

  const flags = new Map(presence.map((row) => [row.id, row]));
  const sizes = new Map<string, Sizes>();
  if (presence.some((row) => row.pdf || row.epub || row.file)) {
    try {
      const rows = await withStatementTimeout("material-bytes", 2500, (tx) =>
        tx.$queryRaw<Sizes[]>`
          SELECT id,
            CASE WHEN "pdfUrl" IS NULL THEN NULL
              ELSE LEAST(2000000000, GREATEST(1, (octet_length("pdfUrl") * 3 / 4)))::int END AS pdf,
            CASE WHEN "epubUrl" IS NULL THEN NULL
              ELSE LEAST(2000000000, GREATEST(1, (octet_length("epubUrl") * 3 / 4)))::int END AS epub,
            CASE WHEN "fileUrl" IS NULL THEN NULL
              ELSE LEAST(2000000000, GREATEST(1, (octet_length("fileUrl") * 3 / 4)))::int END AS file
          FROM "Material"
          WHERE "studentId" = ${studentId}
        `,
      );
      for (const row of rows) sizes.set(row.id, row);
    } catch {
      // withStatementTimeout already logged. The list still renders.
    }
  }

  console.info(`[materials] ${studentId} строк ${materials.length}, ${Date.now() - started}ms`);
  return materials.map((material) => {
    const flag = flags.get(material.id);
    const size = sizes.get(material.id);
    return materialRow(
      material,
      { pdf: flag?.pdf ?? false, epub: flag?.epub ?? false, file: flag?.file ?? false },
      { pdf: size?.pdf ?? null, epub: size?.epub ?? null, file: size?.file ?? null },
    );
  });
}
