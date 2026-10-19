"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import { nextMaterialStatus } from "./status";
import { nextMaterialOrder } from "./materialRows";
import type { MaterialCategory } from "@/generated/prisma/client";

export async function createMaterial(studentId: string, category: MaterialCategory, requestId: string) {
  // requestId makes two clicks in a row different payloads. Identical creates
  // used to collapse into one id, so the second title overwrote the first row.
  if (!requestId) throw new Error("Не удалось создать материал");
  await requireMentor(studentId);
  const lockKey = `material:${studentId}:${category}`;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}), 0)`;
    const max = await tx.material.aggregate({
      where: { studentId, category },
      _max: { order: true },
    });
    const order = nextMaterialOrder(max._max.order == null ? [] : [max._max.order]);
    return tx.material.create({
      data: { studentId, category, order, title: category === "BOOK" ? "Новая книга" : "Новая методичка" },
    });
  });
}

export async function updateMaterialTitle(materialId: string, title: string) {
  const material = await prisma.material.findUniqueOrThrow({ where: { id: materialId } });
  await requireMentor(material.studentId);
  await prisma.material.update({ where: { id: materialId }, data: { title } });
}

export async function cycleMaterialStatus(materialId: string) {
  const material = await prisma.material.findUniqueOrThrow({ where: { id: materialId } });
  await requireCabinetAccess(material.studentId);
  const status = nextMaterialStatus(material.status);
  await prisma.material.update({ where: { id: materialId }, data: { status } });
  return status;
}

export async function deleteMaterial(materialId: string) {
  const material = await prisma.material.findUniqueOrThrow({ where: { id: materialId } });
  await requireMentor(material.studentId);
  await prisma.material.delete({ where: { id: materialId } });
}

export async function setMaterialOptional(materialId: string, optional: boolean) {
  const material = await prisma.material.findUniqueOrThrow({ where: { id: materialId } });
  await requireMentor(material.studentId);
  if (material.category !== "BOOK") return;
  await prisma.material.update({ where: { id: materialId }, data: { optional } });
}

export async function reorderMaterials(studentId: string, ids: string[]) {
  await requireMentor(studentId);
  await Promise.all(ids.map((id, order) => prisma.material.update({ where: { id }, data: { order } })));
}
