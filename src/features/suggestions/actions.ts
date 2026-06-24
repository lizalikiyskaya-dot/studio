"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { SUGGESTION_REGISTRY, type SuggestableModel } from "@/lib/suggestionRegistry";

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
    return { suggested: false };
  }

  const student = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
  if (!student.reviewModeEnabled) {
    await entry.apply(recordId, field, value);
    await prisma.fieldSuggestion.deleteMany({ where: { model, recordId, field } });
    return { suggested: false };
  }

  const currentValue = await entry.getCurrentValue(recordId, field);
  if (!currentValue.trim()) {
    await entry.apply(recordId, field, value);
    return { suggested: false };
  }

  await prisma.fieldSuggestion.upsert({
    where: { model_recordId_field: { model, recordId, field } },
    update: { value },
    create: { model, recordId, field, value },
  });
  return { suggested: true };
}

export async function acceptFieldSuggestion(model: SuggestableModel, recordId: string, field: string) {
  const entry = SUGGESTION_REGISTRY[model];
  const studentId = await entry.getStudentId(recordId);
  await requireCabinetAccess(studentId);

  const suggestion = await prisma.fieldSuggestion.findUnique({
    where: { model_recordId_field: { model, recordId, field } },
  });
  if (!suggestion) return;

  await entry.apply(recordId, field, suggestion.value);
  await prisma.fieldSuggestion.delete({ where: { id: suggestion.id } });
}

export async function getSuggestionsForRecords(model: SuggestableModel, recordIds: string[]) {
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
