"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import { nextMaterialStatus } from "./status";
import type { MaterialCategory } from "@/generated/prisma/client";

export async function createMaterial(studentId: string, category: MaterialCategory) {
  await requireMentor(studentId);
  const count = await prisma.material.count({ where: { studentId, category } });
  return prisma.material.create({
    data: { studentId, category, order: count, title: category === "BOOK" ? "Новая книга" : "Новая методичка" },
  });
}

export async function updateMaterialTitle(materialId: string, title: string) {
  const material = await prisma.material.findUniqueOrThrow({ where: { id: materialId } });
  await requireMentor(material.studentId);
  await prisma.material.update({ where: { id: materialId }, data: { title } });
}

export async function updateMaterialFile(
  materialId: string,
  field: "pdf" | "epub" | "file",
  fileName: string,
  dataUrl: string
) {
  const material = await prisma.material.findUniqueOrThrow({ where: { id: materialId } });
  await requireMentor(material.studentId);
  const data =
    field === "pdf"
      ? { pdfUrl: dataUrl, pdfName: fileName }
      : field === "epub"
        ? { epubUrl: dataUrl, epubName: fileName }
        : { fileUrl: dataUrl, fileName };
  await prisma.material.update({ where: { id: materialId }, data });
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
