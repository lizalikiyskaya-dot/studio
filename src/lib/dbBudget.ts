import { prisma } from "@/lib/prisma";

type BudgetClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Один запрос не должен держать соединение кабинета бесконечно.
 * statement_timeout обрывает сам Postgres, maxWait — ожидание свободного
 * соединения. Ошибка всплывает вызывающему: страница решает, можно ли без этих данных.
 */
export async function withStatementTimeout<T>(
  label: string,
  ms: number,
  run: (tx: BudgetClient) => Promise<T>,
): Promise<T> {
  const started = Date.now();
  const limit = String(Math.max(1, Math.round(ms)));
  try {
    const value = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('statement_timeout', ${limit}, true)`;
        await tx.$executeRaw`SELECT set_config('lock_timeout', ${limit}, true)`;
        return run(tx);
      },
      { maxWait: Math.min(ms, 2000), timeout: ms + 1500 },
    );
    const elapsed = Date.now() - started;
    if (elapsed > 400) console.info(`[db] ${label} ${elapsed}ms`);
    return value;
  } catch (error) {
    console.error(`[db] ${label} не уложился, ${Date.now() - started}ms`, error);
    throw error;
  }
}
