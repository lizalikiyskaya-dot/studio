// Checks docs/sql files before they run on production.
// DROP DEFAULT and ON DELETE are allowed: they do not delete student rows.
// DROP TABLE/COLUMN, TRUNCATE, DELETE, and RENAME are not.

const TX_ONLY =
  /^(?:begin(?:\s+work|\s+transaction(?:\s+isolation\s+level\s+\w+(?:\s+\w+)*)?)?|start\s+transaction(?:\s+isolation\s+level\s+\w+(?:\s+\w+)*)?|commit(?:\s+work)?|rollback(?:\s+work)?|end(?:\s+work)?)$/i;

export function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

export function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function sanitize(text) {
  return String(text)
    .replace(/\b(?:postgres|postgresql):\/\/[^\s'"]+/gi, "postgresql://***")
    .replace(/\bPGPASSWORD=\S+/gi, "PGPASSWORD=***")
    .replace(/\bpassword=\S+/gi, "password=***");
}

export function stripWrappingQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if (first === last && (first === '"' || first === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

export function extractDatabaseUrl(text) {
  let found = null;
  for (let line of String(text).split("\n")) {
    if (line.charCodeAt(0) === 0xfeff) line = line.slice(1);
    line = line.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (key !== "DATABASE_URL") continue;
    const value = stripWrappingQuotes(line.slice(eq + 1).trim());
    if (value && found === null) found = value;
  }
  return found;
}

export function readBaseline(text) {
  const names = [];
  for (const raw of String(text).split("\n")) {
    const line = raw.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const name = line.includes("/") ? line.split("/").pop() : line;
    if (!name || !name.endsWith(".sql") || name.includes("..")) {
      throw new Error(
        `Ошибка: в docs/sql/baseline.txt непонятная строка «${line}». Нужно имя файла, например 2026-10-18-opisanie.sql.`,
      );
    }
    names.push(name);
  }
  return names;
}

export function sortSqlNames(names) {
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function normalizeSql(text) {
  return String(text).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function lineExcerpt(sql, index) {
  const line = sql.slice(0, index).split("\n").length;
  const lineStart = sql.lastIndexOf("\n", index - 1) + 1;
  const lineEnd = sql.indexOf("\n", index);
  const excerpt = sql
    .slice(lineStart, lineEnd === -1 ? sql.length : lineEnd)
    .trim()
    .slice(0, 240);
  return { line, excerpt };
}

// Words outside comments and quoted identifiers, including words inside
// string literals (so EXECUTE 'DROP TABLE …' is still caught).
export function collectWords(sql) {
  const words = [];
  const n = sql.length;
  let i = 0;
  const dollar = [];

  const pushWord = (start) => {
    let j = start + 1;
    while (j < n && /[A-Za-z0-9_]/.test(sql[j])) j++;
    words.push({ word: sql.slice(start, j).toLowerCase(), index: start });
    return j;
  };

  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];

    if (c === "-" && next === "-") {
      i += 2;
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i = Math.min(n, i + 2);
      continue;
    }
    if (c === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        if (/[A-Za-z_]/.test(sql[i])) {
          i = pushWord(i);
          continue;
        }
        i++;
      }
      continue;
    }
    if (c === '"') {
      i++;
      while (i < n) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (sql[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "$") {
      const tag = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (tag) {
        if (dollar.length && dollar[dollar.length - 1] === tag[0]) dollar.pop();
        else dollar.push(tag[0]);
        i += tag[0].length;
        continue;
      }
    }
    if (/[A-Za-z_]/.test(c)) {
      i = pushWord(i);
      continue;
    }
    i++;
  }
  return words;
}

export function findDestructive(sql) {
  const text = normalizeSql(sql);
  const words = collectWords(text);
  const hits = [];
  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    if (token.word === "drop") {
      const next = words[i + 1]?.word;
      const after = words[i + 2]?.word;
      if (next === "default") continue;
      if (next === "not" && after === "null") continue;
      hits.push({ ...lineExcerpt(text, token.index), rule: "DROP" });
    } else if (token.word === "truncate") {
      hits.push({ ...lineExcerpt(text, token.index), rule: "TRUNCATE" });
    } else if (token.word === "delete") {
      if (words[i - 1]?.word === "on") continue;
      hits.push({ ...lineExcerpt(text, token.index), rule: "DELETE" });
    } else if (token.word === "rename") {
      hits.push({ ...lineExcerpt(text, token.index), rule: "RENAME" });
    }
  }
  return hits;
}

export function formatGuardError(filename, hits) {
  const lines = [`Файл ${filename} содержит запрещённую команду.`];
  for (const hit of hits) {
    lines.push(`  строка ${hit.line} (${hit.rule}): ${hit.excerpt}`);
  }
  lines.push(
    "  Можно только добавлять структуру. DROP DEFAULT и ON DELETE CASCADE разрешены: они не стирают строки учеников. Нельзя DROP TABLE, DROP COLUMN, TRUNCATE, DELETE и RENAME.",
  );
  return lines.join("\n");
}

function stripComments(sql) {
  let out = "";
  const n = sql.length;
  let i = 0;
  const dollar = [];
  while (i < n) {
    const c = sql[i];
    const next = sql[i + 1];
    if (c === "-" && next === "-") {
      i += 2;
      while (i < n && sql[i] !== "\n") i++;
      out += " ";
      continue;
    }
    if (c === "/" && next === "*") {
      const start = i;
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i = Math.min(n, i + 2);
      out += " ".repeat(i - start);
      continue;
    }
    if (c === "'") {
      out += c;
      i++;
      while (i < n) {
        out += sql[i];
        if (sql[i] === "'" && sql[i + 1] === "'") {
          out += sql[i + 1];
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '"') {
      out += c;
      i++;
      while (i < n) {
        out += sql[i];
        if (sql[i] === '"' && sql[i + 1] === '"') {
          out += sql[i + 1];
          i += 2;
          continue;
        }
        if (sql[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "$") {
      const tag = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (tag) {
        if (dollar.length && dollar[dollar.length - 1] === tag[0]) dollar.pop();
        else dollar.push(tag[0]);
        out += tag[0];
        i += tag[0].length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

export function splitSql(sql) {
  const text = normalizeSql(sql);
  const out = [];
  const n = text.length;
  let i = 0;
  let start = 0;
  const dollar = [];
  while (i < n) {
    const c = text[i];
    const next = text[i + 1];
    if (c === "-" && next === "-") {
      i += 2;
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i = Math.min(n, i + 2);
      continue;
    }
    if (c === "'") {
      i++;
      while (i < n) {
        if (text[i] === "'" && text[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (text[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '"') {
      i++;
      while (i < n) {
        if (text[i] === '"' && text[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "$") {
      const tag = /^\$[A-Za-z0-9_]*\$/.exec(text.slice(i));
      if (tag) {
        if (dollar.length && dollar[dollar.length - 1] === tag[0]) dollar.pop();
        else dollar.push(tag[0]);
        i += tag[0].length;
        continue;
      }
    }
    if (c === ";" && dollar.length === 0) {
      const stmt = text.slice(start, i).trim();
      if (stmt) out.push(stmt);
      i++;
      start = i;
      continue;
    }
    i++;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

export function statementsToRun(sql) {
  const out = [];
  for (const stmt of splitSql(sql)) {
    const normalized = stripComments(stmt).replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    if (TX_ONLY.test(normalized)) continue;
    out.push(stmt.trim());
  }
  return out;
}
