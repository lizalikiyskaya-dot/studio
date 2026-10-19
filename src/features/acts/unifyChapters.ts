import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { planUnification, type ActCreate, type BlockMove, type ChapterCreate, type ChapterWrite } from "./unifyPlan";

const SYNC_MS = 8000;

async function writeChapters(tx: Prisma.TransactionClient, writes: ChapterWrite[]) {
  if (writes.length === 0) return;
  const values = Prisma.join(
    writes.map(
      (row) => Prisma.sql`(${row.id}::text, ${row.title}::text, ${row.description}::text, ${row.actId}::text)`,
    ),
  );
  await tx.$executeRaw`
    UPDATE "PlanChapter" AS p
    SET title = v.title,
        description = v.description,
        "actId" = v.act_id
    FROM (VALUES ${values}) AS v(id, title, description, act_id)
    WHERE p.id = v.id
  `;
}

async function createActs(tx: Prisma.TransactionClient, acts: ActCreate[]) {
  if (acts.length === 0) return;
  await tx.act.createMany({ data: acts });
}

async function createChapters(tx: Prisma.TransactionClient, creates: ChapterCreate[]) {
  if (creates.length === 0) return;
  await tx.planChapter.createMany({ data: creates });
}

async function moveBlocks(tx: Prisma.TransactionClient, moves: BlockMove[]) {
  if (moves.length === 0) return;
  const values = Prisma.join(
    moves.map((row) => Prisma.sql`(${row.actChapterId}::text, ${row.planChapterId}::text)`),
  );
  await tx.$executeRaw`
    UPDATE "StorylineBlock" AS b
    SET "planChapterId" = v.plan_id,
        "chapterId" = NULL
    FROM (VALUES ${values}) AS v(chapter_id, plan_id)
    WHERE b."chapterId" = v.chapter_id
      AND b."planChapterId" IS NULL
  `;
}

// Один раз на книгу переносит старые главы акта и тексты трекера
// в общую главу PlanChapter. Исходные столбцы не очищает и строки не удаляет.
// Страница не ждёт дольше SYNC_MS и открывается, даже если сверка не удалась.
export async function ensureUnifiedChapters(bookId: string) {
  const started = Date.now();
  try {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { chaptersUnified: true },
    });
    if (!book || book.chaptersUnified) return;

    const limit = String(SYNC_MS);
    const synced = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('statement_timeout', ${limit}, true)`;
        await tx.$executeRaw`SELECT set_config('lock_timeout', ${limit}, true)`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${bookId}), 481516)`;

        const current = await tx.book.findUnique({
          where: { id: bookId },
          select: { chaptersUnified: true },
        });
        if (!current || current.chaptersUnified) return;

        const [plan, acts] = await Promise.all([
          tx.planChapter.findMany({
            where: { bookId },
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: {
              id: true,
              order: true,
              title: true,
              description: true,
              summary: true,
              dramaticArgument: true,
              note: true,
              images: true,
              actId: true,
              actBreakAfter: true,
            },
          }),
          tx.act.findMany({
            where: { bookId },
            orderBy: [{ order: "asc" }, { id: "asc" }],
            select: {
              id: true,
              chapters: {
                orderBy: [{ order: "asc" }, { id: "asc" }],
                select: { id: true, title: true, description: true },
              },
            },
          }),
        ]);

        const planRows = planUnification(bookId, plan, acts);
        // Сначала акты: на них ссылаются главы. Потом главы, потом сцены.
        await createActs(tx, planRows.acts);
        await writeChapters(tx, planRows.writes);
        await createChapters(tx, planRows.creates);
        await moveBlocks(tx, planRows.blockMoves);
        await tx.book.update({ where: { id: bookId }, data: { chaptersUnified: true } });
        return { writes: planRows.writes.length, creates: planRows.creates.length };
      },
      { maxWait: 2000, timeout: SYNC_MS + 1500 },
    );
    if (synced) {
      console.info(
        `[chapters] книга ${bookId} сведена за ${Date.now() - started}ms, правок ${synced.writes}, новых глав ${synced.creates}`,
      );
    }
  } catch (error) {
    console.error(`[chapters] сверка книги ${bookId} не блокирует страницу (${Date.now() - started}ms)`, error);
  }
}
