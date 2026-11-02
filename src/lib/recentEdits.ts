/** Одна строка карточки «Последние правки». */
export type RecentEdit = {
  studentId: string;
  section: string;
  at: string;
};

/**
 * Сначала самый свежий ученик, потом его другие разделы.
 * Лимит режет хвост, а не прячет ученика за чужими старыми разделами.
 */
export function pickRecentEdits(events: RecentEdit[], limit = 8): RecentEdit[] {
  const specific = new Set(events.filter((event) => event.section !== "cabinet").map((event) => event.studentId));
  const useful = events.filter((event) => event.section !== "cabinet" || !specific.has(event.studentId));
  const sorted = [...useful].sort((a, b) => {
    const delta = Date.parse(b.at) - Date.parse(a.at);
    if (delta !== 0) return delta;
    const rank = (section: string) => (section === "cabinet" ? 1 : 0);
    return rank(a.section) - rank(b.section);
  });
  const latestByStudent = new Map<string, RecentEdit>();
  for (const event of sorted) {
    if (!latestByStudent.has(event.studentId)) latestByStudent.set(event.studentId, event);
  }
  const leaders = [...latestByStudent.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const chosen = leaders.slice(0, limit);
  const used = new Set(chosen.map((row) => `${row.studentId}:${row.section}`));
  const allowed = new Set(chosen.map((row) => row.studentId));
  for (const event of sorted) {
    if (chosen.length >= limit) break;
    const key = `${event.studentId}:${event.section}`;
    if (used.has(key) || !allowed.has(event.studentId)) continue;
    chosen.push(event);
    used.add(key);
  }
  return chosen.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
