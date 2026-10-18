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
    out.push(...dels, ...adds);
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
