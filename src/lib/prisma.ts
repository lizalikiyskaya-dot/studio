import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Кабинет на один заход открывает несколько запросов сразу (сессия, заметки,
// задания, маячки). Пул в 3 соединения выстраивал их в очередь.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 10 });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
