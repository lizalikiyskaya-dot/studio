#!/usr/bin/env node
// Backup Postgres, then apply each new docs/sql/*.sql once, inside a transaction.
// A failing file is rolled back. The caller (scripts/deploy.sh) must not restart
// the app when this process exits with an error.
//
// DATABASE_URL is read from APP_PATH/.env (or the systemd EnvironmentFile).
// It is never printed.

import crypto from "node:crypto";
import { once } from "node:events";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  extractDatabaseUrl,
  findDestructive,
  formatGuardError,
  normalizeSql,
  quoteIdent,
  quoteLiteral,
  readBaseline,
  sanitize,
  sortSqlNames,
  statementsToRun,
  stripWrappingQuotes,
} from "./sql-guard.mjs";

const LOCK_KEY = "8710231842016";
const BACKUP_RE = /^studio-backup-\d{8}T\d{6}Z\.(dump|sql)$/;
const PRISMA_ONLY_PARAMS = new Set([
  "schema",
  "connection_limit",
  "pool_timeout",
  "pgbouncer",
  "socket_timeout",
]);

function log(message) {
  const stamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  console.log(`${stamp} ${sanitize(message)}`);
}

function hooksOn() {
  return process.env.SQL_TEST_HOOKS === "1";
}

function fail(message) {
  const text = sanitize(message);
  console.error(text.startsWith("Ошибка:") ? text : `Ошибка: ${text}`);
  process.exit(1);
}

export function parseDatabaseUrl(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Ошибка: DATABASE_URL не удалось разобрать. Значение в лог не пишется.");
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Ошибка: DATABASE_URL должен начинаться с postgresql://. Значение в лог не пишется.");
  }
  return parsed;
}

export function nodeConnectionString(databaseUrl) {
  const parsed = parseDatabaseUrl(databaseUrl);
  for (const key of [...parsed.searchParams.keys()]) {
    if (PRISMA_ONLY_PARAMS.has(key)) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

export function libpqEnv(databaseUrl, baseEnv = process.env) {
  const parsed = parseDatabaseUrl(databaseUrl);
  const env = { ...baseEnv };
  for (const key of Object.keys(env)) {
    if (key.startsWith("PG")) delete env[key];
  }
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (user) env.PGUSER = user;
  if (password) env.PGPASSWORD = password;
  const hostParam = parsed.searchParams.get("host");
  if (hostParam) env.PGHOST = hostParam;
  else if (parsed.hostname) env.PGHOST = decodeURIComponent(parsed.hostname);
  env.PGPORT = parsed.searchParams.get("port") || parsed.port || "5432";
  if (database) env.PGDATABASE = database;
  const map = {
    sslmode: "PGSSLMODE",
    sslrootcert: "PGSSLROOTCERT",
    sslcert: "PGSSLCERT",
    sslkey: "PGSSLKEY",
    sslpassword: "PGSSLPASSWORD",
    application_name: "PGAPPNAME",
    options: "PGOPTIONS",
    connect_timeout: "PGCONNECT_TIMEOUT",
  };
  for (const [param, envName] of Object.entries(map)) {
    const value = parsed.searchParams.get(param);
    if (value) env[envName] = value;
  }
  if (!env.PGAPPNAME) env.PGAPPNAME = "studio-apply-sql";
  if (!env.PGCONNECT_TIMEOUT) env.PGCONNECT_TIMEOUT = "15";
  return env;
}

function findBinary(name) {
  const found = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" });
  if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  const root = "/usr/lib/postgresql";
  if (!fs.existsSync(root)) return null;
  const versions = fs.readdirSync(root).sort().reverse();
  for (const version of versions) {
    const candidate = path.join(root, version, "bin", name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function loadSqlFiles(sqlDir) {
  if (!fs.existsSync(sqlDir)) return [];
  const names = fs.readdirSync(sqlDir).filter((name) => {
    if (!name.endsWith(".sql") || name.startsWith(".")) return false;
    if (name.includes("/") || name.includes("..") || /[\0\r\n]/.test(name)) return false;
    return fs.statSync(path.join(sqlDir, name)).isFile();
  });
  return sortSqlNames(names).map((name) => {
    const full = path.join(sqlDir, name);
    const bytes = fs.readFileSync(full);
    return {
      name,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
      text: normalizeSql(bytes.toString("utf8")),
    };
  });
}

function databaseUrlFromSystemd(service) {
  let stdout = "";
  try {
    const result = spawnSync("systemctl", ["cat", service], { encoding: "utf8" });
    if (!result || result.status !== 0 || !result.stdout) return null;
    stdout = result.stdout;
  } catch {
    return null;
  }
  const files = [];
  let inline = null;
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
    if (trimmed.startsWith("EnvironmentFile=")) {
      let filePath = trimmed.slice("EnvironmentFile=".length).trim();
      if (filePath.startsWith("-")) filePath = filePath.slice(1);
      filePath = stripWrappingQuotes(filePath);
      if (filePath) files.push(filePath);
    } else if (trimmed.startsWith("Environment=")) {
      const found = extractSystemdDatabaseUrl(trimmed.slice("Environment=".length).trim());
      if (found) inline = found;
    }
  }
  if (inline) return { url: inline, source: "окружения сервиса systemd" };
  for (const filePath of files) {
    try {
      const url = extractDatabaseUrl(fs.readFileSync(filePath, "utf8"));
      if (url) return { url, source: "файла окружения сервиса systemd" };
    } catch {
      // try the next file
    }
  }
  return null;
}

function extractSystemdDatabaseUrl(rest) {
  const text = stripWrappingQuotes(rest.trim());
  const match = text.match(/(?:^|\s)DATABASE_URL=(?:"([^"]*)"|'([^']*)'|(\S+))/);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

function resolveDatabaseUrl(appPath) {
  const envFile = path.join(appPath, ".env");
  if (fs.existsSync(envFile)) {
    let raw = "";
    try {
      raw = fs.readFileSync(envFile, "utf8");
    } catch {
      throw new Error("Ошибка: не удалось прочитать .env приложения. SQL не применялся.");
    }
    const url = extractDatabaseUrl(raw);
    if (url) return { url, source: ".env" };
  }
  const service = process.env.SYSTEMD_SERVICE || "";
  if (service && /^[A-Za-z0-9@._-]+$/.test(service)) {
    const fromUnit = databaseUrlFromSystemd(service);
    if (fromUnit) return fromUnit;
  }
  if (process.env.DATABASE_URL) {
    return { url: process.env.DATABASE_URL, source: "окружения процесса" };
  }
  return null;
}

async function loadPg() {
  try {
    const mod = await import("pg");
    return mod.Client || mod.default?.Client;
  } catch {
    throw new Error("Ошибка: пакет pg не найден. Он ставится командой npm ci в этом же деплое.");
  }
}

async function connect(databaseUrl) {
  const Client = await loadPg();
  const client = new Client({
    connectionString: nodeConnectionString(databaseUrl),
    application_name: "studio-apply-sql",
    connectionTimeoutMillis: 15000,
  });
  client.on("error", () => {});
  try {
    await client.connect();
  } catch (err) {
    await client.end().catch(() => {});
    throw new Error(
      `Ошибка: не удалось подключиться к базе. Проверьте DATABASE_URL. Подробности: ${sanitize(err.message)}`,
    );
  }
  return client;
}

async function readLedger(client) {
  const reg = await client.query(`SELECT to_regclass('public._applied_sql') AS name`);
  if (!reg.rows[0]?.name) return new Map();
  const rows = await client.query(`SELECT "filename", "sha256" FROM "_applied_sql"`);
  return new Map(rows.rows.map((row) => [row.filename, row.sha256]));
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_applied_sql" (
      "filename" TEXT PRIMARY KEY,
      "sha256" TEXT NOT NULL,
      "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

function ensureWritable(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const probe = path.join(dir, `.write-probe-${process.pid}`);
  fs.writeFileSync(probe, "");
  fs.unlinkSync(probe);
  try {
    fs.chmodSync(dir, 0o700);
  } catch {
    // the directory may be owned by another user; writing is enough
  }
  return dir;
}

function chooseBackupDir(appPath) {
  if (process.env.BACKUP_DIR) return ensureWritable(process.env.BACKUP_DIR);
  const candidates = [];
  if (fs.existsSync("/srv/studio")) candidates.push("/srv/studio/backups");
  if (appPath) candidates.push(path.resolve(appPath, "..", "backups"));
  candidates.push(path.join(os.homedir(), "studio-backups"));
  const errors = [];
  for (const dir of candidates) {
    try {
      return ensureWritable(dir);
    } catch (err) {
      errors.push(`${dir}: ${sanitize(err.message)}`);
    }
  }
  throw new Error(
    `Ошибка: некуда записать бэкап, SQL не применялся. ${errors.join("; ")}`,
  );
}

function backupStamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "");
}

function cleanPartials(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith("studio-backup-") && name.endsWith(".partial")) {
      try {
        fs.unlinkSync(path.join(dir, name));
      } catch {
        // a leftover partial is not a reason to skip the new backup
      }
    }
  }
}

function pruneBackups(dir) {
  const entries = fs
    .readdirSync(dir)
    .filter((name) => BACKUP_RE.test(name))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const old of entries.slice(10)) {
    fs.unlinkSync(path.join(dir, old.name));
    log(`Удаляю старый бэкап: ${old.name}`);
  }
}

function fsyncFile(file) {
  const fd = fs.openSync(file, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function verifyDump(file) {
  const fd = fs.openSync(file, "r");
  try {
    const buf = Buffer.alloc(5);
    const read = fs.readSync(fd, buf, 0, 5, 0);
    if (read < 5 || buf.toString() !== "PGDMP") {
      throw new Error("файл бэкапа не похож на дамп pg_dump");
    }
  } finally {
    fs.closeSync(fd);
  }
  if (fs.statSync(file).size <= 0) throw new Error("файл бэкапа пустой");
}

function verifySqlBackup(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("-- studio backup") || !text.trimEnd().endsWith("COMMIT;")) {
    throw new Error("текстовый бэкап записался не до конца");
  }
}

function runCapture(bin, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(sanitize(stderr.trim() || `${path.basename(bin)} завершился с кодом ${code}`)));
    });
  });
}

async function runPgDump(bin, databaseUrl, file) {
  await runCapture(
    bin,
    ["--format=custom", "--no-owner", "--no-acl", "--no-password", "--file", file],
    libpqEnv(databaseUrl),
  );
}

function writeChunk(stream, text) {
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      stream.off("drain", onDrain);
      reject(err);
    };
    const onDrain = () => {
      stream.off("error", onError);
      resolve();
    };
    stream.once("error", onError);
    if (stream.write(text)) {
      stream.off("error", onError);
      resolve();
    } else {
      stream.once("drain", onDrain);
    }
  });
}

async function createNodeBackup(databaseUrl, destPath) {
  const client = await connect(databaseUrl);
  const stream = fs.createWriteStream(destPath, { mode: 0o600 });
  const tag = `$b${crypto.randomBytes(8).toString("hex")}$`;
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const when = new Date().toISOString();
    await writeChunk(
      stream,
      [
        "-- studio backup",
        `-- снята: ${when}`,
        "-- способ: node",
        "-- Секретов в файле нет.",
        "-- Восстанавливать в ПУСТУЮ базу, сайт перед этим остановить.",
        "-- psql -v ON_ERROR_STOP=1 -f этот_файл.sql",
        "BEGIN;",
        "SET search_path TO public;",
        "",
      ].join("\n"),
    );

    const extensions = await client.query(
      "SELECT extname FROM pg_extension WHERE extname <> 'plpgsql' ORDER BY extname",
    );
    for (const row of extensions.rows) {
      await writeChunk(stream, `CREATE EXTENSION IF NOT EXISTS ${quoteIdent(row.extname)};\n`);
    }

    const enumRows = await client.query(`
      SELECT t.typname AS name, e.enumlabel AS label
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);
    const enums = [];
    for (const row of enumRows.rows) {
      const last = enums[enums.length - 1];
      if (!last || last.name !== row.name) enums.push({ name: row.name, labels: [row.label] });
      else last.labels.push(row.label);
    }
    for (const row of enums) {
      const labels = row.labels.map((label) => quoteLiteral(label)).join(", ");
      await writeChunk(
        stream,
        `DO ${tag}\nBEGIN\n  IF NOT EXISTS (\n    SELECT 1 FROM pg_type t\n    JOIN pg_namespace n ON n.oid = t.typnamespace\n    WHERE n.nspname = 'public' AND t.typname = ${quoteLiteral(row.name)}\n  ) THEN\n    CREATE TYPE ${quoteIdent(row.name)} AS ENUM (${labels});\n  END IF;\nEND\n${tag};\n`,
      );
    }

    const sequences = await client.query(`
      SELECT c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'S'
      ORDER BY c.relname
    `);
    for (const row of sequences.rows) {
      await writeChunk(
        stream,
        `CREATE SEQUENCE IF NOT EXISTS ${quoteIdent("public")}.${quoteIdent(row.name)};\n`,
      );
    }

    const tables = await client.query(`
      SELECT c.oid::text AS oid, n.nspname AS schema, c.relname AS name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `);

    const columnsByTable = new Map();
    for (const table of tables.rows) {
      const cols = await client.query(
        `
        SELECT a.attname AS name,
               format_type(a.atttypid, a.atttypmod) AS format_type,
               a.attnotnull AS not_null,
               a.attidentity AS identity,
               a.attgenerated AS generated,
               pg_get_expr(d.adbin, d.adrelid) AS default_expr
        FROM pg_attribute a
        LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = $1::oid AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY a.attnum
        `,
        [table.oid],
      );
      columnsByTable.set(table.oid, cols.rows);
      const lines = cols.rows.map((col) => {
        let line = `  ${quoteIdent(col.name)} ${col.format_type}`;
        if (col.generated === "s" && col.default_expr) {
          line += ` GENERATED ALWAYS AS (${col.default_expr}) STORED`;
        } else if (col.identity === "a") {
          line += " GENERATED ALWAYS AS IDENTITY";
        } else if (col.identity === "d") {
          line += " GENERATED BY DEFAULT AS IDENTITY";
        } else if (col.default_expr) {
          line += ` DEFAULT ${col.default_expr}`;
        }
        if (col.not_null) line += " NOT NULL";
        return line;
      });
      await writeChunk(
        stream,
        `CREATE TABLE ${quoteIdent(table.schema)}.${quoteIdent(table.name)} (\n${lines.join(",\n")}\n);\n`,
      );
    }

    const owners = await client.query(`
      SELECT seq.relname AS seq, tab.relname AS table_name, att.attname AS column_name
      FROM pg_class seq
      JOIN pg_namespace n ON n.oid = seq.relnamespace
      JOIN pg_depend d ON d.objid = seq.oid AND d.deptype = 'a'
      JOIN pg_class tab ON tab.oid = d.refobjid
      JOIN pg_attribute att ON att.attrelid = tab.oid AND att.attnum = d.refobjsubid
      WHERE n.nspname = 'public' AND seq.relkind = 'S'
      ORDER BY seq.relname
    `);
    for (const row of owners.rows) {
      await writeChunk(
        stream,
        `ALTER SEQUENCE ${quoteIdent("public")}.${quoteIdent(row.seq)} OWNED BY ${quoteIdent("public")}.${quoteIdent(row.table_name)}.${quoteIdent(row.column_name)};\n`,
      );
    }

    for (const table of tables.rows) {
      const cols = (columnsByTable.get(table.oid) || []).filter((col) => col.generated !== "s");
      if (!cols.length) continue;
      const exprs = cols.map((col) => {
        const ident = quoteIdent(col.name);
        return `CASE WHEN ${ident} IS NULL THEN 'NULL' ELSE format('%L', ${ident}::text) || '::' || ${quoteLiteral(col.format_type)} END`;
      });
      const selectSql = `SELECT (${exprs.join(" || ',' || ")}) AS vals FROM ${quoteIdent(table.schema)}.${quoteIdent(table.name)}`;
      await client.query("DECLARE studio_backup_c NO SCROLL CURSOR FOR " + selectSql);
      const colList = cols.map((col) => quoteIdent(col.name)).join(", ");
      const override = cols.some((col) => col.identity === "a" || col.identity === "d")
        ? " OVERRIDING SYSTEM VALUE"
        : "";
      for (;;) {
        const batch = await client.query("FETCH 100 FROM studio_backup_c");
        if (!batch.rows.length) break;
        for (const row of batch.rows) {
          await writeChunk(
            stream,
            `INSERT INTO ${quoteIdent(table.schema)}.${quoteIdent(table.name)} (${colList})${override} VALUES (${row.vals});\n`,
          );
        }
      }
      await client.query("CLOSE studio_backup_c");
    }

    // Primary keys before foreign keys: a child table may sort before its parent.
    for (const foreignKey of [false, true]) {
      for (const table of tables.rows) {
        const constraints = await client.query(
          `
          SELECT con.conname, con.contype, pg_get_constraintdef(con.oid) AS def
          FROM pg_constraint con
          WHERE con.conrelid = $1::oid
          ORDER BY con.conname
          `,
          [table.oid],
        );
        for (const row of constraints.rows) {
          if ((row.contype === "f") !== foreignKey) continue;
          await writeChunk(
            stream,
            `ALTER TABLE ${quoteIdent(table.schema)}.${quoteIdent(table.name)} ADD CONSTRAINT ${quoteIdent(row.conname)} ${row.def};\n`,
          );
        }
      }
    }
    for (const table of tables.rows) {
      const indexes = await client.query(
        `
        SELECT pg_get_indexdef(i.indexrelid) AS def
        FROM pg_index i
        WHERE i.indrelid = $1::oid
          AND NOT i.indisprimary
          AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = i.indexrelid)
        ORDER BY i.indexrelid
        `,
        [table.oid],
      );
      for (const row of indexes.rows) {
        await writeChunk(stream, `${row.def};\n`);
      }
    }

    for (const row of sequences.rows) {
      const state = await client.query(
        `SELECT last_value, is_called FROM ${quoteIdent("public")}.${quoteIdent(row.name)}`,
      );
      const last = state.rows[0];
      if (!last) continue;
      const regclass = `public.${quoteIdent(row.name)}`;
      await writeChunk(
        stream,
        `SELECT setval(${quoteLiteral(regclass)}, ${last.last_value}, ${last.is_called ? "true" : "false"});\n`,
      );
    }

    await writeChunk(stream, "COMMIT;\n");
    await client.query("COMMIT");
    stream.end();
    await once(stream, "finish");
    fsyncFile(destPath);
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // the read transaction may already be closed
    }
    stream.destroy();
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

async function createBackup(databaseUrl, dir) {
  cleanPartials(dir);
  const stamp = backupStamp();
  const nodeOnly = hooksOn() && process.env.SQL_BACKUP_VIA === "node";
  const dumpOnly = hooksOn() && process.env.SQL_BACKUP_VIA === "pg_dump";
  const disableNode = hooksOn() && process.env.SQL_DISABLE_NODE_BACKUP === "1";

  if (!nodeOnly) {
    const bin =
      hooksOn() && process.env.SQL_PG_DUMP ? process.env.SQL_PG_DUMP : findBinary("pg_dump");
    if (bin) {
      const partial = path.join(dir, `studio-backup-${stamp}.dump.partial`);
      const finalPath = path.join(dir, `studio-backup-${stamp}.dump`);
      try {
        await runPgDump(bin, databaseUrl, partial);
        verifyDump(partial);
        fsyncFile(partial);
        fs.renameSync(partial, finalPath);
        pruneBackups(dir);
        log(
          `Бэкап записан: ${finalPath} (pg_dump, ${fs.statSync(finalPath).size} байт). Храню последние 10.`,
        );
        return finalPath;
      } catch (err) {
        try {
          fs.unlinkSync(partial);
        } catch {
          // already gone
        }
        if (dumpOnly || disableNode) {
          throw new Error(
            `Ошибка: pg_dump не смог снять бэкап, SQL не применялся. ${sanitize(err.message)}`,
          );
        }
        log(`pg_dump не подошёл (${sanitize(oneLine(err.message))}). Снимаю бэкап через node.`);
      }
    } else if (dumpOnly || disableNode) {
      throw new Error("Ошибка: pg_dump не найден, SQL не применялся.");
    } else {
      log("pg_dump не найден, снимаю бэкап через node.");
    }
  }

  if (disableNode) {
    throw new Error("Ошибка: бэкап не снят, SQL не применялся.");
  }

  const partial = path.join(dir, `studio-backup-${stamp}.sql.partial`);
  const finalPath = path.join(dir, `studio-backup-${stamp}.sql`);
  try {
    await createNodeBackup(databaseUrl, partial);
    verifySqlBackup(partial);
    fs.renameSync(partial, finalPath);
    pruneBackups(dir);
    log(
      `Бэкап записан: ${finalPath} (node, ${fs.statSync(finalPath).size} байт). Храню последние 10.`,
    );
    return finalPath;
  } catch (err) {
    try {
      fs.unlinkSync(partial);
    } catch {
      // already gone
    }
    throw new Error(`Ошибка: не удалось снять бэкап, SQL не применялся. ${sanitize(err.message)}`);
  }
}

function oneLine(text) {
  return String(text).replace(/\s+/g, " ").trim().slice(0, 300);
}

function wrapSql(statements, filename, sha256) {
  const parts = ["BEGIN"];
  for (const stmt of statements) parts.push(stmt.replace(/;\s*$/, ""));
  parts.push(
    `INSERT INTO "_applied_sql" ("filename", "sha256", "applied_at") VALUES (${quoteLiteral(filename)}, ${quoteLiteral(sha256)}, now())`,
  );
  return `${parts.join(";\n")};\nCOMMIT;\n`;
}

async function applyWithPsql(bin, databaseUrl, file, statements) {
  const tmp = path.join(os.tmpdir(), `studio-sql-${process.pid}-${crypto.randomBytes(4).toString("hex")}.sql`);
  fs.writeFileSync(tmp, wrapSql(statements, file.name, file.sha256), { mode: 0o600 });
  try {
    await runCapture(
      bin,
      ["-w", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-f", tmp],
      libpqEnv(databaseUrl),
    );
  } catch (err) {
    throw new Error(
      `Ошибка: не удалось применить ${file.name}. Транзакция отменена, этот файл в базу не попал.\n${sanitize(err.message).slice(0, 2000)}`,
    );
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // temp file is not a secret
    }
  }
}

async function applyWithNode(client, file, statements) {
  await client.query("BEGIN");
  try {
    for (const stmt of statements) await client.query(stmt);
    await client.query(
      `INSERT INTO "_applied_sql" ("filename", "sha256", "applied_at") VALUES ($1, $2, now())`,
      [file.name, file.sha256],
    );
    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // already aborted
    }
    throw new Error(
      `Ошибка: не удалось применить ${file.name}. Транзакция отменена, этот файл в базу не попал.\n${sanitize(err.message).slice(0, 2000)}`,
    );
  }
}

async function applyFile(databaseUrl, client, file) {
  const statements = statementsToRun(file.text);
  const preferNode = hooksOn() && process.env.SQL_APPLY_VIA === "node";
  const psql = preferNode ? null : findBinary("psql");
  if (psql) {
    await applyWithPsql(psql, databaseUrl, file, statements);
    return "psql";
  }
  await applyWithNode(client, file, statements);
  return "node";
}

function preflight(files, baseline, ledger) {
  const problems = [];
  const toApply = [];
  const toMark = [];
  const baselineSet = new Set(baseline);

  for (const name of baseline) {
    const file = files.find((item) => item.name === name);
    if (!ledger.has(name)) {
      toMark.push(
        file ?? {
          name,
          sha256: crypto.createHash("sha256").update(`baseline-missing:${name}`).digest("hex"),
        },
      );
    }
  }

  for (const file of files) {
    if (baselineSet.has(file.name)) continue;
    const recorded = ledger.get(file.name);
    if (recorded) {
      if (recorded !== file.sha256) {
        problems.push(
          `Файл ${file.name} уже применялся, но содержимое изменилось. Повторно он не запускается. Добавьте новый файл.`,
        );
      }
      continue;
    }
    const hits = findDestructive(file.text);
    if (hits.length) problems.push(formatGuardError(file.name, hits));
    else toApply.push(file);
  }

  return { problems, toApply, toMark };
}

async function run() {
  if (process.argv.includes("--check")) {
    const file = process.argv[process.argv.indexOf("--check") + 1];
    if (!file) fail("Ошибка: укажите файл после --check");
    const hits = findDestructive(fs.readFileSync(file, "utf8"));
    if (hits.length) {
      fail(`Ошибка: деплой остановлен, база не менялась.\n${formatGuardError(path.basename(file), hits)}`);
    }
    console.log(`OK ${path.basename(file)}`);
    return;
  }

  const appPath = process.env.APP_PATH || process.cwd();
  const sqlDir = process.env.SQL_DIR || path.join(appPath, "docs", "sql");
  const baselinePath = path.join(sqlDir, "baseline.txt");
  const baseline = fs.existsSync(baselinePath)
    ? readBaseline(fs.readFileSync(baselinePath, "utf8"))
    : [];
  const files = loadSqlFiles(sqlDir);

  if (files.length === 0 && baseline.length === 0) {
    log("Новых SQL-файлов нет, базу не трогаю.");
    return;
  }

  const resolved = resolveDatabaseUrl(appPath);
  if (!resolved) {
    throw new Error(
      "Ошибка: в .env нет DATABASE_URL, а в docs/sql есть файлы. SQL не применялся, сайт не перезапускается.",
    );
  }
  log(`Строка подключения прочитана из ${resolved.source}.`);

  const client = await connect(resolved.url);
  let backupPath = "";
  try {
    await client.query("SELECT pg_advisory_lock($1::bigint)", [LOCK_KEY]);
    try {
      const ledger = await readLedger(client);
      const plan = preflight(files, baseline, ledger);
      if (plan.problems.length) {
        throw new Error(
          `Ошибка: деплой остановлен, база не менялась, сайт не перезапускается.\n${plan.problems.join("\n")}`,
        );
      }
      if (plan.toApply.length === 0 && plan.toMark.length === 0) {
        log(`Новых SQL нет (файлов ${files.length}, все уже в учёте). Бэкап не делаю.`);
        return;
      }

      const names = plan.toApply.map((file) => file.name).join(", ");
      if (plan.toApply.length) log(`К выполнению, по порядку имени: ${names}`);
      if (plan.toMark.length) {
        log(`Без выполнения, уже были на проде: ${plan.toMark.map((file) => file.name).join(", ")}`);
      }

      const backupDir = chooseBackupDir(appPath);
      log(`Каталог бэкапов: ${backupDir}`);
      backupPath = await createBackup(resolved.url, backupDir);

      await ensureTable(client);
      if (plan.toMark.length) {
        await client.query("BEGIN");
        try {
          for (const file of plan.toMark) {
            await client.query(
              `INSERT INTO "_applied_sql" ("filename", "sha256", "applied_at") VALUES ($1, $2, now()) ON CONFLICT ("filename") DO NOTHING`,
              [file.name, file.sha256],
            );
            log(`Помечен как уже применённый, без выполнения: ${file.name}`);
          }
          await client.query("COMMIT");
        } catch (err) {
          try {
            await client.query("ROLLBACK");
          } catch {
            // ignore
          }
          throw err;
        }
      }

      const appliedNow = [];
      try {
        for (const file of plan.toApply) {
          log(`Применяю ${file.name}`);
          const via = await applyFile(resolved.url, client, file);
          appliedNow.push(file.name);
          log(`Применён ${file.name} (${via})`);
        }
      } catch (err) {
        const extra = appliedNow.length
          ? `\nУже успешно применены в этом запуске: ${appliedNow.join(", ")}. Они только добавляют структуру.`
          : "\nЭтот файл в базу не попал.";
        throw new Error(
          `${err.message}${extra}\nСайт не перезапускается. Бэкап: ${backupPath}`,
        );
      }
      log(`SQL готово: применено ${plan.toApply.length}, помечено без выполнения ${plan.toMark.length}.`);
    } finally {
      try {
        await client.query("SELECT pg_advisory_unlock($1::bigint)", [LOCK_KEY]);
      } catch {
        // the connection may already be closed
      }
    }
  } finally {
    await client.end().catch(() => {});
  }
}

const isDirect = process.argv[1] && process.argv[1].endsWith("apply-sql.mjs");
if (isDirect) {
  run().catch((err) => fail(err && err.message ? err.message : String(err)));
}
