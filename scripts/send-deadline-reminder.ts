import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Одно напоминание одному ученику, прямо сейчас.
 * Запуск из каталога приложения, от пользователя studio:
 *   npx tsx scripts/send-deadline-reminder.ts --dry-run "Саша"
 *   npx tsx scripts/send-deadline-reminder.ts student@example.com
 *
 * Письмо, отправка и метка в журнале те же, что у прогона в 9:00.
 * Повтор на то же задание и тот же срок не уходит.
 */

function loadEnvFile() {
  let text = "";
  try {
    text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function args(argv: string[]): { dryRun: boolean; query: string } | { help: true } {
  const rest = argv.filter((item) => item !== "--");
  if (rest.includes("-h") || rest.includes("--help")) return { help: true };
  const dryRun = rest.includes("--dry-run");
  const query = rest.filter((item) => item !== "--dry-run").join(" ").trim();
  return { dryRun, query };
}

function help() {
  console.log(`Одно напоминание о сроке одному ученику.

  npx tsx scripts/send-deadline-reminder.ts --dry-run "Имя"
  npx tsx scripts/send-deadline-reminder.ts name@example.com

--dry-run печатает получателя, задания и тему и ничего не отправляет.
Берёт несданные задания со сроком завтра по Москве.`);
}

async function main() {
  const parsed = args(process.argv.slice(2));
  if ("help" in parsed) {
    help();
    return 0;
  }
  if (!parsed.query) {
    help();
    return 1;
  }
  loadEnvFile();
  const { prisma } = await import("../src/lib/prisma");
  const { runOneDeadlineReminder } = await import("../src/lib/deadlineReminderRun");
  try {
    const result = await runOneDeadlineReminder(parsed.query, parsed.dryRun);
    for (const line of result.lines) console.log(line);
    return result.code;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
