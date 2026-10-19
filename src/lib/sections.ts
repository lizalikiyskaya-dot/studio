/**
 * Человеческие названия разделов кабинета. Ключи совпадают с сегментом
 * URL после `/dashboard` / `/student-view/<id>` (см. SectionTracker) и с
 * тем, что лежит в SectionActivity.section.
 */
export const SECTION_LABELS: Record<string, string> = {
  tasks: "Задания",
  weekly: "Задание недели",
  "work-plan": "План работы",
  materials: "Материалы",
  drafts: "Рукописи",
  exercises: "Упражнения",
  submissions: "Трекер заявок",
  "open-calls": "Опен-коллы",
  about: "О книге",
  plan: "Трекер по главам",
  acts: "План книги",
  dossier: "Досье персонажей",
  arcs: "Арки персонажей",
  setting: "Сеттинг",
  cycles: "Циклы рассказов",
  stories: "Отдельные рассказы",
};

export function sectionLabel(section: string): string {
  return SECTION_LABELS[section] ?? section;
}
