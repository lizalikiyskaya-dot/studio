export type AwaitingKind = "task" | "weekly" | "chapter";

export type AwaitingItem = {
  kind: AwaitingKind;
  id: string;
  student: string;
  title: string;
  at: string | null;
  href: string;
};

export function awaitingKindLabel(kind: AwaitingKind): string {
  if (kind === "weekly") return "задание недели";
  if (kind === "chapter") return "глава";
  return "задание";
}

/** Сколько уже ждёт. Без даты — наставник уже взял главу на проверку, момента сдачи нет. */
export function waitingLabel(at: string | null, now: Date): string {
  if (!at) return "на проверке";
  const mins = Math.max(0, Math.round((now.getTime() - Date.parse(at)) / 60000));
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.round(hours / 24);
  const mod10 = days % 10;
  const mod100 = days % 100;
  const word = mod10 === 1 && mod100 !== 11 ? "день" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "дня" : "дней";
  return `${days} ${word}`;
}

/** Сначала то, что сдали раньше. Без даты уходит в конец. */
export function sortAwaiting(items: AwaitingItem[]): AwaitingItem[] {
  return [...items].sort((a, b) => {
    const at = a.at ? Date.parse(a.at) : Number.POSITIVE_INFINITY;
    const bt = b.at ? Date.parse(b.at) : Number.POSITIVE_INFINITY;
    if (at !== bt) return at - bt;
    return a.student.localeCompare(b.student, "ru") || a.title.localeCompare(b.title, "ru");
  });
}
