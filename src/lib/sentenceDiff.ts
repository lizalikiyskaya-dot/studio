export type DiffToken = { type: "same" | "del" | "add"; text: string };

/**
 * Диф по словам: общее начало и конец, включая пробелы и знаки, не трогаем.
 * Замена одного слова — только это слово зачёркнуто, следом новое.
 * Несколько замен в одной фразе остаются отдельными кусками.
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

function isWordChar(ch: string) {
  return /[0-9A-Za-zА-Яа-яЁё-]/.test(ch);
}

type Word = { word: string; gapAfter: string };

/** Слово с хвостом пробелов. Знаки остаются при слове, общие края срежет диф. */
function splitWordGaps(text: string): Word[] {
  const out: Word[] = [];
  const lead = /^\s+/.exec(text);
  const rest = lead ? text.slice(lead[0].length) : text;
  if (lead) out.push({ word: "", gapAfter: lead[0] });
  const re = /(\S+)(\s*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(rest))) out.push({ word: match[1], gapAfter: match[2] });
  return out;
}

type Op =
  | { type: "same"; old: Word; neu: Word }
  | { type: "del"; word: Word }
  | { type: "add"; word: Word };

function alignWords(oldWords: Word[], newWords: Word[]): Op[] {
  const a = oldWords.map((word) => word.word);
  const b = newWords.map((word) => word.word);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push({ type: "same", old: oldWords[i], neu: newWords[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "del", word: oldWords[i] });
      i++;
    } else {
      ops.push({ type: "add", word: newWords[j] });
      j++;
    }
  }
  while (i < m) ops.push({ type: "del", word: oldWords[i++] });
  while (j < n) ops.push({ type: "add", word: newWords[j++] });
  return ops;
}

function joinWords(words: Word[], keepTrail: boolean) {
  let text = "";
  words.forEach((word, index) => {
    text += word.word;
    if (keepTrail || index < words.length - 1) text += word.gapAfter;
  });
  return text;
}

/** Заменённый кусок: все старые слова, затем все новые. Общий пробел после куска — один раз. */
function renderSpan(dels: Word[], adds: Word[]): DiffToken[] {
  const oldTrail = dels.length ? dels[dels.length - 1].gapAfter : "";
  const newTrail = adds.length ? adds[adds.length - 1].gapAfter : "";
  const shareTrail = dels.length > 0 && adds.length > 0 && oldTrail === newTrail;
  const tokens: DiffToken[] = [];
  const deleted = joinWords(dels, !shareTrail);
  const added = joinWords(adds, !shareTrail);
  if (deleted) tokens.push({ type: "del", text: deleted });
  if (added) tokens.push({ type: "add", text: added });
  if (shareTrail && oldTrail) tokens.push({ type: "same", text: oldTrail });
  return tokens;
}

export function sentenceDiff(oldText: string, newText: string): DiffToken[] {
  if (oldText === newText) return oldText ? [{ type: "same", text: oldText }] : [];
  const ops = alignWords(splitWordGaps(oldText), splitWordGaps(newText));
  const raw: DiffToken[] = [];
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    if (op.type === "same") {
      if (op.old.word) raw.push({ type: "same", text: op.old.word });
      if (op.old.gapAfter === op.neu.gapAfter) {
        if (op.old.gapAfter) raw.push({ type: "same", text: op.old.gapAfter });
      } else {
        if (op.old.gapAfter) raw.push({ type: "del", text: op.old.gapAfter });
        if (op.neu.gapAfter) raw.push({ type: "add", text: op.neu.gapAfter });
      }
      i++;
      continue;
    }
    const dels: Word[] = [];
    const adds: Word[] = [];
    while (i < ops.length && ops[i].type !== "same") {
      const next = ops[i];
      if (next.type === "del") dels.push(next.word);
      else if (next.type === "add") adds.push(next.word);
      i++;
    }
    raw.push(...renderSpan(dels, adds));
  }
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

function atWordBoundary(text: string, index: number) {
  if (index <= 0 || index >= text.length) return true;
  return !isWordChar(text[index - 1]) || !isWordChar(text[index]);
}

function wordBoundaryPrefix(text: string, index: number) {
  if (atWordBoundary(text, index)) return index;
  let i = index;
  while (i > 0 && isWordChar(text[i - 1])) i--;
  return i;
}

function wordBoundarySuffix(text: string, suffix: number) {
  const start = text.length - suffix;
  if (atWordBoundary(text, start)) return suffix;
  let i = start;
  while (i < text.length && isWordChar(text[i])) i++;
  return text.length - i;
}
