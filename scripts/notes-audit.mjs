import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

/**
 * Только чтение заметок, ответов и журнала напоминаний.
 * Запуск из каталога приложения:
 *   node scripts/notes-audit.mjs
 * Печатает количества, контрольные суммы и номера. Тексты и имена не печатает.
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

function cells(row) {
  return Object.values(row).map((value) => (value == null ? "" : String(value))).join("\t");
}

async function main() {
  loadEnvFile();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Нет DATABASE_URL. Команда ничего не записала.");
    process.exit(1);
  }
  const sql = readFileSync(new URL("./notes-audit.sql", import.meta.url), "utf8");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(sql);
    const sets = Array.isArray(result) ? result : [result];
    for (const set of sets) {
      if (!set.rows) continue;
      for (const row of set.rows) console.log(cells(row));
      if (set.rows.length) console.log("");
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
