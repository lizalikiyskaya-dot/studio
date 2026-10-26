import { appUrl } from "@/lib/mail";
import { queueCabinetChange } from "@/lib/activityDigest";

export const MENTOR_DIGEST_GROUPS = ["accepted", "revision", "note", "text", "feedback"] as const;
export type MentorDigestGroup = (typeof MENTOR_DIGEST_GROUPS)[number];

const TEXT_MODELS = new Set([
  "PopArcCharacter",
  "BeliefCard",
  "StoryCircleCard",
  "FreeSection",
  "PlanChapter",
  "Book",
  "Cycle",
  "Act",
  "GrapesSetting",
]);

export function reviewGroup(status: string): "accepted" | "revision" | null {
  if (status === "ACCEPTED") return "accepted";
  if (status === "NEEDS_REVISION") return "revision";
  return null;
}

export function isMentorTextModel(model: string): boolean {
  return TEXT_MODELS.has(model);
}

export function mentorDigestLine(title: string, url: string): string {
  const name = title.replace(/\s+/g, " ").trim().slice(0, 120) || "Без названия";
  return `${name}\t${url}`;
}

export function studentTaskUrl(taskId: string, tab: "accepted" | "revision" | "all"): string {
  const query = tab === "all" ? "" : `?tab=${tab}`;
  return `${appUrl()}/dashboard/tasks${query}#task-${taskId}`;
}

export function studentExerciseUrl(focus: "arc" | "belief" | "circle" | "extra", id: string): string {
  return `${appUrl()}/dashboard/exercises?focus=${focus}#exercise-${id}`;
}

export function textModelTitle(model: string): string {
  switch (model) {
    case "PopArcCharacter":
      return "Арка персонажа";
    case "BeliefCard":
      return "Начало и конец пути";
    case "StoryCircleCard":
      return "Путь героя";
    case "FreeSection":
      return "Дополнительно";
    case "PlanChapter":
      return "Глава";
    case "Book":
      return "О книге";
    case "Cycle":
      return "Цикл рассказов";
    case "Act":
      return "План книги";
    case "GrapesSetting":
      return "Сеттинг";
    default:
      return "Текст";
  }
}

function settingField(field: string): boolean {
  return /^(grapes|fantasy|setting)/.test(field);
}

/** «Глава: Начало», если у записи есть своё имя. Поля GRAPES на книге — это сеттинг. */
export function mentorTextLineTitle(model: string, name: string | null | undefined, field = ""): string {
  const label = model === "Book" && settingField(field) ? "Сеттинг" : textModelTitle(model);
  const trimmed = (name ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return label;
  return `${label}: ${trimmed}`;
}

export function textModelUrl(model: string, recordId: string, field = ""): string {
  if (model === "Book" && settingField(field)) return `${appUrl()}/dashboard/setting`;
  switch (model) {
    case "PopArcCharacter":
      return studentExerciseUrl("arc", recordId);
    case "BeliefCard":
      return studentExerciseUrl("belief", recordId);
    case "StoryCircleCard":
      return studentExerciseUrl("circle", recordId);
    case "FreeSection":
      return studentExerciseUrl("extra", recordId);
    case "PlanChapter":
      return `${appUrl()}/dashboard/plan#chapter-${recordId}`;
    case "Book":
      return `${appUrl()}/dashboard/about`;
    case "Cycle":
      return `${appUrl()}/dashboard/cycles`;
    case "Act":
      return `${appUrl()}/dashboard/acts`;
    case "GrapesSetting":
      return `${appUrl()}/dashboard/setting#setting-${recordId}`;
    default:
      return `${appUrl()}/dashboard/tasks`;
  }
}

export function noteUrl(anchorUrl: string | undefined): string {
  const url = anchorUrl?.trim() ?? "";
  if (url.startsWith("/dashboard/")) return `${appUrl()}${url}`;
  const view = url.match(/\/student-view\/[^/]+\/(.+)$/);
  if (view) return `${appUrl()}/dashboard/${view[1]}`;
  return `${appUrl()}/dashboard/tasks`;
}

/** В пачку «Наставник внёс правку». Если тумблер выключен, строка не пишется. */
export async function queueMentorDigest(input: {
  studentId: string;
  group: MentorDigestGroup;
  sourceId: string;
  title: string;
  url: string;
}) {
  await queueCabinetChange({
    studentId: input.studentId,
    byMentor: true,
    section: `${input.group}:${input.sourceId}`,
    detail: mentorDigestLine(input.title, input.url),
  });
}
