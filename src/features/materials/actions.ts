"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { nextMaterialStatus } from "./status";

export async function createMaterial(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.material.count({ where: { studentId } });
  return prisma.material.create({
    data: { studentId, order: count, title: "Новая книга" },
  });
}

export async function updateMaterialTitle(materialId: string, title: string) {
  const material = await prisma.material.findUniqueOrThrow({ where: { id: materialId } });
  await requireCabinetAccess(material.studentId);
  await prisma.material.update({ where: { id: materialId }, data: { title } });
}

export async function updateMaterialLink(
  materialId: string,
  field: "pdfUrl" | "epubUrl",
  value: string
) {
  const material = await prisma.material.findUniqueOrThrow({ where: { id: materialId } });
  await requireCabinetAccess(material.studentId);
  await prisma.material.update({ where: { id: materialId }, data: { [field]: value } });
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
  await requireCabinetAccess(material.studentId);
  await prisma.material.delete({ where: { id: materialId } });
}
