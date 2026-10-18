export type DiffToken = { type: "same" | "del" | "add"; text: string };

/**
 * Диф по ПРЕДЛОЖЕНИЯМ, а не по словам.
 *
 * Пословный диф давал рваную картину: зачёркнутое слово, рядом новое,
 * снова кусок старого текста — читать правку невозможно. Здесь изменённое
 * предложение зачёркивается целиком, а следом идёт целиком новое.
 */

const TERMINATORS = /[.!?…]/;
const CLOSERS = /["»”'’)\]]/;

/**
 * Режет текст на предложения, СОХРАНЯЯ знаки препинания и пробелы —
 * склейка кусков обратно должна давать ровно исходную строку.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    buf += ch;

    // Перевод строки — всегда граница: абзацы не склеиваем.
    if (ch === "\n") {
      while (i + 1 < text.length && text[i + 1] === "\n") buf += text[++i];
      out.push(buf);
      buf = "";
      continue;
    }

    if (TERMINATORS.test(ch)) {
      // Добираем подряд идущие знаки («?!», «...») и закрывающие кавычки.
      while (i + 1 < text.length && (TERMINATORS.test(text[i + 1]) || CLOSERS.test(text[i + 1]))) {
        buf += text[++i];
      }
      // Пробелы после точки принадлежат этому же предложению.
      while (i + 1 < text.length && (text[i + 1] === " " || text[i + 1] === "\t")) {
        buf += text[++i];
      }
      // Строчная буква следом — скорее всего сокращение («т. д.», «и т. п.»),
      // а не конец предложения.
      const next = text[i + 1];
      if (next && /[a-zа-яё]/.test(next)) continue;
      out.push(buf);
      buf = "";
    }
  }

  if (buf) out.push(buf);
  return out;
}

/** Ключ сравнения: пробелы по краям и их количество внутри не считаем правкой. */
function key(sentence: string): string {
  return sentence.trim().replace(/\s+/g, " ");
}

export function sentenceDiff(oldText: string, newText: string): DiffToken[] {
  const oldSentences = splitSentences(oldText);
  const newSentences = splitSentences(newText);
  const a = oldSentences.map(key);
  const b = newSentences.map(key);
  const m = a.length;
  const n = b.length;

  // Классический LCS: общие предложения остаются на месте, остальное
  // расходится в «убрано» и «добавлено».
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const raw: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      raw.push({ type: "same", text: oldSentences[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ type: "del", text: oldSentences[i] });
      i++;
    } else {
      raw.push({ type: "add", text: newSentences[j] });
      j++;
    }
  }
  while (i < m) raw.push({ type: "del", text: oldSentences[i++] });
  while (j < n) raw.push({ type: "add", text: newSentences[j++] });

  return groupChanges(raw);
}

/**
 * Внутри одного изменённого куска сначала показываем всё убранное, потом
 * всё добавленное — иначе старое и новое чередуются и снова получается
 * каша, ради ухода от которой всё и затевалось.
 */
function groupChanges(tokens: DiffToken[]): DiffToken[] {
  const out: DiffToken[] = [];
  let dels: DiffToken[] = [];
  let adds: DiffToken[] = [];

  const flush = () => {
    const deleted = dels.map((token) => token.text).join("");
    const added = adds.map((token) => token.text).join("");
    if (deleted && added) out.push(...withoutSharedEdges(deleted, added));
    else out.push(...dels, ...adds);
    dels = [];
    adds = [];
  };

  for (const token of tokens) {
    if (token.type === "same") {
      flush();
      out.push(token);
    } else if (token.type === "del") {
      dels.push(token);
    } else {
      adds.push(token);
    }
  }
  flush();
  return out;
}

/**
 * Общий край изменённого куска показываем один раз.
 * Иначе замена «Роман, северная проза» → «Роман, северная проза…новое»
 * рисуется как зачёркнутое старое плюс то же старое внутри нового.
 * Режем только по границе слова, чтобы не дробить литературный текст.
 */
function withoutSharedEdges(deleted: string, added: string): DiffToken[] {
  let prefix = sharedPrefix(deleted, added);
  if (prefix > 0 && prefix < deleted.length && prefix < added.length) {
    prefix = wordBoundaryPrefix(deleted, prefix);
  }
  let suffix = sharedSuffix(deleted, added, prefix);
  if (suffix > 0 && prefix + suffix < deleted.length && prefix + suffix < added.length) {
    suffix = wordBoundarySuffix(deleted, suffix);
  }

  if (prefix === 0 && suffix === 0) {
    return [
      { type: "del", text: deleted },
      { type: "add", text: added },
    ];
  }

  const tokens: DiffToken[] = [];
  if (prefix > 0) tokens.push({ type: "same", text: deleted.slice(0, prefix) });
  const deletedMiddle = deleted.slice(prefix, deleted.length - suffix);
  const addedMiddle = added.slice(prefix, added.length - suffix);
  if (deletedMiddle) tokens.push({ type: "del", text: deletedMiddle });
  if (addedMiddle) tokens.push({ type: "add", text: addedMiddle });
  if (suffix > 0) tokens.push({ type: "same", text: deleted.slice(deleted.length - suffix) });
  return tokens;
}

function sharedPrefix(a: string, b: string) {
  const limit = Math.min(a.length, b.length);
  let i = 0;
  while (i < limit && a[i] === b[i]) i++;
  return i;
}

function sharedSuffix(a: string, b: string, prefix: number) {
  const limit = Math.min(a.length, b.length) - prefix;
  let i = 0;
  while (i < limit && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

function wordBoundaryPrefix(text: string, index: number) {
  if (index <= 0) return 0;
  if (/\s/.test(text[index] ?? "") || /\s/.test(text[index - 1] ?? "")) return index;
  const space = text.lastIndexOf(" ", index);
  return space === -1 ? 0 : space + 1;
}

function wordBoundarySuffix(text: string, suffix: number) {
  const start = text.length - suffix;
  if (start <= 0) return suffix;
  if (/\s/.test(text[start] ?? "") || /\s/.test(text[start - 1] ?? "")) return suffix;
  const space = text.indexOf(" ", start);
  if (space === -1) return 0;
  return text.length - space;
}
