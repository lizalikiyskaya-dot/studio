import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.MENTOR_EMAIL;
  const password = process.env.MENTOR_PASSWORD;
  const name = process.env.MENTOR_NAME ?? "Лиза Ликийская";

  if (!email || !password) {
    throw new Error(
      "Укажите MENTOR_EMAIL и MENTOR_PASSWORD в .env перед запуском сида"
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const mentor = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      passwordHash,
      role: "MENTOR",
      status: "APPROVED",
    },
  });

  console.log(`Наставник готов: ${mentor.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
