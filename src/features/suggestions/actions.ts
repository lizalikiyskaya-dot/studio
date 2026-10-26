"use server";

import { prisma } from "@/lib/prisma";
import { requireAuthenticated, requireCabinetAccess } from "@/lib/access";
import { SUGGESTION_REGISTRY, type SuggestableModel } from "@/lib/suggestionRegistry";
import { resolveHunk } from "@/lib/suggestionHunks";
import { MODEL_SECTION, queueCabinetChange } from "@/lib/activityDigest";

async function noteChange(studentId: string, byMentor: boolean, model: string, detail: string) {
  await queueCabinetChange({
    studentId,
    byMentor,
    section: MODEL_SECTION[model] ?? "tasks",
    detail,
  });
}

/**
 * Student edits apply directly. A mentor edit over an already
 * non-empty value is stored as a suggestion instead of applied, so
 * the student can review the diff and accept it explicitly.
 */
export async function saveFieldOrSuggest(
  model: SuggestableModel,
  recordId: string,
  field: string,
  value: string
) {
  const entry = SUGGESTION_REGISTRY[model];
  const studentId = await entry.getStudentId(recordId);
  const session = await requireCabinetAccess(studentId);

  if (session.role === "STUDENT") {
    await entry.apply(recordId, field, value);
    await prisma.fieldSuggestion.deleteMany({ where: { model, recordId, field } });
    await noteChange(studentId, false, model, "Правка");
    return { suggested: false };
  }

  const student = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
  if (!student.reviewModeEnabled) {
    await entry.apply(recordId, field, value);
    await prisma.fieldSuggestion.deleteMany({ where: { model, recordId, field } });
    await noteChange(studentId, true, model, "Правка");
    return { suggested: false };
  }

  const currentValue = await entry.getCurrentValue(recordId, field);
  if (!currentValue.trim() || value === currentValue) {
    if (value !== currentValue) {
      await entry.apply(recordId, field, value);
      await noteChange(studentId, true, model, "Правка");
    }
    await prisma.fieldSuggestion.deleteMany({ where: { model, recordId, field } });
    return { suggested: false };
  }

  await prisma.fieldSuggestion.upsert({
    where: { model_recordId_field: { model, recordId, field } },
    update: { value },
    create: { model, recordId, field, value },
  });
  await noteChange(studentId, true, model, "Предложение");
  return { suggested: true };
}

export async function acceptFieldSuggestion(model: SuggestableModel, recordId: string, field: string) {
  const entry = SUGGESTION_REGISTRY[model];
  const studentId = await entry.getStudentId(recordId);
  const session = await requireCabinetAccess(studentId);

  const suggestion = await prisma.fieldSuggestion.findUnique({
    where: { model_recordId_field: { model, recordId, field } },
  });
  if (!suggestion) return;

  await entry.apply(recordId, field, suggestion.value);
  await prisma.fieldSuggestion.delete({ where: { id: suggestion.id } });
  if (model === "FreeSection" && field === "content") await finishSectionFormat(recordId, true);
  await noteChange(studentId, session.role === "MENTOR", model, "Правка");
}

export async function resolveSuggestionHunk(
  model: SuggestableModel,
  recordId: string,
  field: string,
  hunkIndex: number,
  action: "accept" | "reject",
) {
  const entry = SUGGESTION_REGISTRY[model];
  const studentId = await entry.getStudentId(recordId);
  const session = await requireCabinetAccess(studentId);

  const suggestion = await prisma.fieldSuggestion.findUnique({
    where: { model_recordId_field: { model, recordId, field } },
  });
  const currentValue = await entry.getCurrentValue(recordId, field);
  if (!suggestion) return { value: currentValue, suggestion: null as string | null };

  const next = resolveHunk(currentValue, suggestion.value, hunkIndex, action);
  if (next.value !== currentValue) await entry.apply(recordId, field, next.value);
  if (next.suggestion == null) {
    await prisma.fieldSuggestion.deleteMany({ where: { model, recordId, field } });
    if (model === "FreeSection" && field === "content") {
      await finishSectionFormat(recordId, next.value === suggestion.value);
    }
  } else if (next.suggestion !== suggestion.value) {
    await prisma.fieldSuggestion.update({ where: { id: suggestion.id }, data: { value: next.suggestion } });
  }
  if (next.value !== currentValue) await noteChange(studentId, session.role === "MENTOR", model, "Правка");
  return next;
}

/** Отклонить правку целиком: в поле остаётся текст ученика. */
export async function rejectFieldSuggestion(model: SuggestableModel, recordId: string, field: string) {
  const entry = SUGGESTION_REGISTRY[model];
  const studentId = await entry.getStudentId(recordId);
  await requireCabinetAccess(studentId);

  await prisma.fieldSuggestion.deleteMany({ where: { model, recordId, field } });
  if (model === "FreeSection" && field === "content") await finishSectionFormat(recordId, false);
}

async function finishSectionFormat(recordId: string, apply: boolean) {
  const pending = await prisma.fieldSuggestion.findUnique({
    where: { model_recordId_field: { model: "FreeSection", recordId, field: "contentFormat" } },
  });
  if (apply && pending && (pending.value === "plain" || pending.value === "markdown")) {
    await prisma.freeSection.update({ where: { id: recordId }, data: { contentFormat: pending.value } });
  }
  if (pending) await prisma.fieldSuggestion.delete({ where: { id: pending.id } });
}

export async function getSuggestionsForRecords(model: SuggestableModel, recordIds: string[]) {
  // Серверное действие доступно из интернета напрямую — читать правки
  // наставника должен только вошедший пользователь с открытым доступом.
  await requireAuthenticated();
  if (recordIds.length === 0) return {};
  const rows = await prisma.fieldSuggestion.findMany({
    where: { model, recordId: { in: recordIds } },
  });
  const map: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    map[row.recordId] ??= {};
    map[row.recordId][row.field] = row.value;
  }
  return map;
}
