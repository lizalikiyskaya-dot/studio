export type DiffToken = { type: "same" | "del" | "add"; text: string };

/**
 * Word-level diff (keeps whitespace as its own tokens) using a simple
 * LCS so that a one-word edit only highlights that word, instead of
 * the whole sentence being shown as removed+added.
 */
export function wordDiff(oldText: string, newText: string): DiffToken[] {
  const oldTokens = oldText.split(/(\s+)/).filter((t) => t.length > 0);
  const newTokens = newText.split(/(\s+)/).filter((t) => t.length > 0);
  const m = oldTokens.length;
  const n = newTokens.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        oldTokens[i] === newTokens[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldTokens[i] === newTokens[j]) {
      result.push({ type: "same", text: oldTokens[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "del", text: oldTokens[i] });
      i++;
    } else {
      result.push({ type: "add", text: newTokens[j] });
      j++;
    }
  }
  while (i < m) {
    result.push({ type: "del", text: oldTokens[i] });
    i++;
  }
  while (j < n) {
    result.push({ type: "add", text: newTokens[j] });
    j++;
  }
  return result;
}
