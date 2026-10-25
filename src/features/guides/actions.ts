"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AccessDeniedError, requireCabinetAccess, requireMentorSession } from "@/lib/access";
import { GUIDE_AUDIENCE, forgetGuidesSchema, guidesSchemaReady, listOpenedStudents } from "@/lib/guides";
import { notifyStudentGuideOpened } from "@/lib/notify";
import { nextMaterialStatus } from "@/features/materials/status";
import type { MaterialStatus } from "@/generated/prisma/client";
import { ensureGuideBadge, removeGuideBadge } from "@/features/badges/sync";
import { guideOpenShouldEmail } from "./openGuide";
import type { ActionFail, ActionResult, LibraryGuide, OpenedStudent } from "./types";

const NOT_READY = "Библиотека методичек ещё не подключена к базе. Сначала нужно выполнить SQL.";

function touch(studentId?: string) {
  revalidatePath("/mentor/guides");
  revalidatePath("/dashboard/materials");
  if (studentId) {
    revalidatePath(`/student-view/${studentId}/materials`);
  } else {
    revalidatePath("/student-view/[studentId]/materials", "page");
  }
}

async function mentorReady(): Promise<ActionFail | null> {
  try {
    await requireMentorSession();
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: error.message };
    throw error;
  }
  if (!(await guidesSchemaReady())) return { ok: false, error: NOT_READY };
  return null;
}

function schemaOrThrow(error: unknown): ActionFail | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = String((error as { code?: unknown }).code);
  if (code !== "P2021" && code !== "P2022") return null;
  forgetGuidesSchema();
  return { ok: false, error: NOT_READY };
}

function cleanTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 200);
}

function cleanDescription(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().slice(0, 1000);
}

export async function createGuide(): Promise<ActionResult<{ guide: LibraryGuide }>> {
  const denied = await mentorReady();
  if (denied) return denied;
  try {
    const count = await prisma.guide.count();
    const guide = await prisma.guide.create({
      data: { title: "Новая методичка", order: count },
      select: {
        id: true,
        title: true,
        description: true,
        fileName: true,
        fileMime: true,
        order: true,
      },
    });
    await ensureGuideBadge(guide.id, guide.title);
    touch();
    return {
      ok: true,
      guide: {
        id: guide.id,
        title: guide.title,
        description: guide.description,
        fileName: guide.fileName,
        fileMime: guide.fileMime,
        fileBytes: null,
        hasFile: false,
        isPdf: false,
        order: guide.order,
        visibleCount: 0,
        openedStudents: [],
      },
    };
  } catch (error) {
    const missing = schemaOrThrow(error);
    if (missing) return missing;
    throw error;
  }
}

export async function updateGuideTitle(guideId: string, title: string): Promise<ActionResult> {
  const denied = await mentorReady();
  if (denied) return denied;
  try {
    const nextTitle = cleanTitle(title);
    await prisma.guide.update({ where: { id: guideId }, data: { title: nextTitle } });
    await ensureGuideBadge(guideId, nextTitle);
    touch();
    return { ok: true };
  } catch (error) {
    const missing = schemaOrThrow(error);
    if (missing) return missing;
    return { ok: false, error: "Не удалось сохранить название" };
  }
}

export async function updateGuideDescription(guideId: string, description: string): Promise<ActionResult> {
  const denied = await mentorReady();
  if (denied) return denied;
  try {
    await prisma.guide.update({
      where: { id: guideId },
      data: { description: cleanDescription(description) },
    });
    touch();
    return { ok: true };
  } catch (error) {
    const missing = schemaOrThrow(error);
    if (missing) return missing;
    return { ok: false, error: "Не удалось сохранить описание" };
  }
}

export async function deleteGuide(guideId: string): Promise<ActionResult> {
  const denied = await mentorReady();
  if (denied) return denied;
  try {
    await removeGuideBadge(guideId);
    await prisma.guide.delete({ where: { id: guideId } });
    touch();
    return { ok: true };
  } catch (error) {
    const missing = schemaOrThrow(error);
    if (missing) return missing;
    return { ok: false, error: "Не удалось удалить методичку" };
  }
}

export async function reorderGuides(ids: string[]): Promise<ActionResult> {
  const denied = await mentorReady();
  if (denied) return denied;
  try {
    await prisma.$transaction(ids.map((id, order) => prisma.guide.update({ where: { id }, data: { order } })));
    touch();
    return { ok: true };
  } catch (error) {
    const missing = schemaOrThrow(error);
    if (missing) return missing;
    return { ok: false, error: "Не удалось сохранить порядок" };
  }
}

async function openNotice(guideId: string, studentIds: string[]) {
  if (studentIds.length === 0) return;
  const guide = await prisma.guide.findUnique({
    where: { id: guideId },
    select: { id: true, title: true, description: true },
  });
  if (!guide) return;
  for (const studentId of studentIds) {
    await notifyStudentGuideOpened(studentId, guide);
  }
}

export async function setGuideVisibleForStudent(
  guideId: string,
  studentId: string,
  visible: boolean,
  notify = false
): Promise<ActionResult<{ visible: boolean }>> {
  const denied = await mentorReady();
  if (denied) return denied;
  try {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { role: true },
    });
    if (!student || student.role !== "STUDENT") return { ok: false, error: "Ученик не найден" };
    const guide = await prisma.guide.findUnique({ where: { id: guideId }, select: { id: true } });
    if (!guide) return { ok: false, error: "Методичка не найдена" };

    const existing = await prisma.guideAccess.findUnique({
      where: { guideId_studentId: { guideId, studentId } },
      select: { visible: true },
    });
    const wasVisible = existing?.visible ?? false;
    await prisma.guideAccess.upsert({
      where: { guideId_studentId: { guideId, studentId } },
      create: { guideId, studentId, visible },
      update: { visible },
    });
    if (guideOpenShouldEmail({ visible, wasVisible, notify })) await openNotice(guideId, [studentId]);
    touch(studentId);
    return { ok: true, visible };
  } catch (error) {
    const missing = schemaOrThrow(error);
    if (missing) return missing;
    throw error;
  }
}

export async function setGuideVisibleForAll(
  guideId: string,
  visible: boolean,
  notify = false
): Promise<ActionResult<{ visibleCount: number; openedStudents: OpenedStudent[] }>> {
  const denied = await mentorReady();
  if (denied) return denied;
  try {
    const guide = await prisma.guide.findUnique({ where: { id: guideId }, select: { id: true } });
    if (!guide) return { ok: false, error: "Методичка не найдена" };

    if (!visible) {
      await prisma.guideAccess.updateMany({ where: { guideId }, data: { visible: false } });
      touch();
      return { ok: true, visibleCount: 0, openedStudents: [] };
    }

    const students = await prisma.user.findMany({
      where: GUIDE_AUDIENCE,
      select: { id: true },
    });
    const existing = await prisma.guideAccess.findMany({
      where: { guideId },
      select: { studentId: true, visible: true },
    });
    const wasVisible = new Map(existing.map((row) => [row.studentId, row.visible]));
    if (students.length > 0) {
      await prisma.$transaction(
        students.map((student) =>
          prisma.guideAccess.upsert({
            where: { guideId_studentId: { guideId, studentId: student.id } },
            create: { guideId, studentId: student.id, visible: true },
            update: { visible: true },
          })
        )
      );
    }
    const newlyOpened = students
      .filter((student) =>
        guideOpenShouldEmail({
          visible: true,
          wasVisible: wasVisible.get(student.id) === true,
          notify,
        })
      )
      .map((student) => student.id);
    await openNotice(guideId, newlyOpened);
    touch();
    const openedStudents = await listOpenedStudents(guideId);
    return { ok: true, visibleCount: openedStudents.length, openedStudents };
  } catch (error) {
    const missing = schemaOrThrow(error);
    if (missing) return missing;
    throw error;
  }
}

export async function cycleGuideStatus(
  guideId: string,
  studentId: string
): Promise<ActionResult<{ status: MaterialStatus }>> {
  try {
    const session = await requireCabinetAccess(studentId);
    if (!(await guidesSchemaReady())) return { ok: false, error: NOT_READY };
    if (session.role !== "MENTOR") {
      const access = await prisma.guideAccess.findUnique({
        where: { guideId_studentId: { guideId, studentId } },
        select: { visible: true },
      });
      if (!access?.visible) return { ok: false, error: "Нет доступа" };
    } else {
      const guide = await prisma.guide.findUnique({ where: { id: guideId }, select: { id: true } });
      if (!guide) return { ok: false, error: "Методичка не найдена" };
    }
    const progress = await prisma.guideProgress.findUnique({
      where: { guideId_studentId: { guideId, studentId } },
      select: { status: true },
    });
    const status = nextMaterialStatus(progress?.status ?? "UNREAD");
    await prisma.guideProgress.upsert({
      where: { guideId_studentId: { guideId, studentId } },
      create: { guideId, studentId, status },
      update: { status },
    });
    touch(studentId);
    return { ok: true, status };
  } catch (error) {
    if (error instanceof AccessDeniedError) return { ok: false, error: error.message };
    const missing = schemaOrThrow(error);
    if (missing) return missing;
    throw error;
  }
}
