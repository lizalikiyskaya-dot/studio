/** Логин в поле имени не показываем. Обычное имя, в том числе латиницей, остаётся. */
export function isAccountLogin(token: string): boolean {
  if (/[_\d@]/.test(token)) return true;
  if (/[А-Яа-яЁё]/.test(token)) return false;
  return /[a-z][A-Z]/.test(token);
}

export function personName(fullName: string): string {
  const kept: string[] = [];
  for (const raw of fullName.trim().split(/\s+/)) {
    const token = raw.replace(/^[«"(\[]+|[»").,\]]+$/g, "");
    if (!token || isAccountLogin(token)) continue;
    kept.push(token);
  }
  return kept.join(" ");
}

export function guideOpenDate(at: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Moscow",
  }).format(at);
}

/** «Открыли: Имя — дата». Логин не подставляется: такой строки нет. */
export function guideOpenLine(name: string, at: Date): string | null {
  const who = personName(name);
  if (!who) return null;
  return `Открыли: ${who} — ${guideOpenDate(at)}`;
}

export function shouldRecordGuideOpen(role: string): boolean {
  return role === "STUDENT";
}

/** Повторное открытие не сдвигает firstOpenedAt и не считается первым. */
export function guideReadDecision(
  existing: { firstOpenedAt: Date } | null,
  now: Date,
): { first: boolean; firstOpenedAt: Date; lastOpenedAt: Date } {
  if (!existing) return { first: true, firstOpenedAt: now, lastOpenedAt: now };
  return { first: false, firstOpenedAt: existing.firstOpenedAt, lastOpenedAt: now };
}
