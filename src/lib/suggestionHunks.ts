import { sentenceDiff, type DiffToken } from "@/lib/sentenceDiff";

export type MarkedToken = DiffToken & { hunk: number | null };

/** Токены диффа с номером правки. Одинаковый текст — без номера. */
export function markedSuggestion(base: string, suggested: string): MarkedToken[] {
  const tokens = sentenceDiff(base, suggested);
  let hunk = -1;
  let open = false;
  return tokens.map((token) => {
    if (token.type === "same") {
      open = false;
      return { ...token, hunk: null };
    }
    if (!open) {
      hunk += 1;
      open = true;
    }
    return { ...token, hunk };
  });
}

export function hunkCount(base: string, suggested: string): number {
  let count = 0;
  for (const token of markedSuggestion(base, suggested)) {
    if (token.hunk != null && token.hunk + 1 > count) count = token.hunk + 1;
  }
  return count;
}

/**
 * Принять или отклонить одну правку, остальные оставить.
 * Если правок не осталось, suggestion = null.
 */
export function resolveHunk(
  base: string,
  suggested: string,
  hunkIndex: number,
  action: "accept" | "reject",
): { value: string; suggestion: string | null } {
  const tokens = markedSuggestion(base, suggested);
  if (!tokens.some((token) => token.hunk === hunkIndex)) {
    return { value: base, suggestion: base === suggested ? null : suggested };
  }
  const remaining = tokens.some((token) => token.hunk != null && token.hunk !== hunkIndex);

  if (action === "accept") {
    // Последняя правка целиком берёт предложенный текст, без сборки по кускам.
    if (!remaining) return { value: suggested, suggestion: null };
    const value = tokens
      .filter((token) => token.hunk !== hunkIndex ? token.type !== "add" : token.type === "add")
      .map((token) => token.text)
      .join("");
    return { value, suggestion: suggested };
  }

  const suggestion = tokens
    .filter((token) => token.hunk !== hunkIndex ? token.type !== "del" : token.type === "del")
    .map((token) => token.text)
    .join("");
  return { value: base, suggestion: remaining && suggestion !== base ? suggestion : null };
}
