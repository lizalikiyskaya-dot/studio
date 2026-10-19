export type PlanView = "ribbon" | "tiles" | "map";
export type ProgressKind = "none" | "work" | "almost" | "done";

export function normalizePlanView(value: string | null | undefined): PlanView {
  if (value === "tiles" || value === "map" || value === "ribbon") return value;
  return "ribbon";
}

export function progressPercent(written: number, planned: number) {
  if (planned <= 0) return 0;
  return Math.round((written / planned) * 100);
}

export function progressKind(written: number, planned: number): ProgressKind {
  if (planned <= 0 || written <= 0) return "none";
  if (written >= planned) return "done";
  if (written * 10 >= planned * 7) return "almost";
  return "work";
}

type TextSource = {
  description: string;
  summary: string;
  dramaticArgument: string;
  note: string;
  images: string;
};

function pushUnique(parts: string[], text: string) {
  const value = text.trim();
  if (!value) return;
  const haystack = parts.join("\n\n");
  if (haystack.includes(value)) return;
  parts.push(value);
}

// Собирает описание плана так, чтобы старые тексты трекера и главы акта
// оказались внутри и не повторялись при повторном запуске.
export function foldedDescription(source: TextSource, extras: string[] = []) {
  const parts: string[] = [];
  pushUnique(parts, source.description);
  pushUnique(parts, source.summary);
  if (source.dramaticArgument.trim()) pushUnique(parts, `Ядро\n${source.dramaticArgument.trim()}`);
  if (source.note.trim()) pushUnique(parts, `Примечание\n${source.note.trim()}`);
  if (source.images.trim()) pushUnique(parts, `Образы\n${source.images.trim()}`);
  for (const extra of extras) pushUnique(parts, extra);
  return parts.join("\n\n");
}

export function chapterTitle(current: string, actTitle: string, summary: string) {
  if (current.trim()) return current;
  if (actTitle.trim()) return actTitle.trim();
  const line = summary.split("\n")[0]?.trim() ?? "";
  return line.slice(0, 160);
}
