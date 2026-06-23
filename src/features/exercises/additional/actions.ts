"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import type { FreeSectionType } from "@/generated/prisma/client";

export async function createAdditionalSection(
  studentId: string,
  type: FreeSectionType,
  rows?: number,
  cols?: number
) {
  await requireMentor(studentId);
  const count = await prisma.freeSection.count({ where: { studentId } });
  const tableData =
    type === "TABLE"
      ? Array.from({ length: rows ?? 2 }, () => Array.from({ length: cols ?? 2 }, () => ""))
      : undefined;
  return prisma.freeSection.create({
    data: {
      studentId,
      order: count,
      type,
      title: type === "TABLE" ? "Новая таблица" : "Новый вопрос",
      tableData,
    },
  });
}

export async function updateSectionTitle(sectionId: string, title: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireMentor(section.studentId);
  await prisma.freeSection.update({ where: { id: sectionId }, data: { title } });
}

export async function updateSectionContent(sectionId: string, content: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireCabinetAccess(section.studentId);
  await prisma.freeSection.update({ where: { id: sectionId }, data: { content } });
}

export async function updateTableCell(sectionId: string, row: number, col: number, value: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireCabinetAccess(section.studentId);
  const grid = ((section.tableData as string[][]) ?? []).map((r) => [...r]);
  if (grid[row]) grid[row][col] = value;
  await prisma.freeSection.update({ where: { id: sectionId }, data: { tableData: grid } });
}

export async function resizeTable(sectionId: string, rows: number, cols: number) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireMentor(section.studentId);
  const current = (section.tableData as string[][]) ?? [];
  const grid = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => current[r]?.[c] ?? "")
  );
  await prisma.freeSection.update({ where: { id: sectionId }, data: { tableData: grid } });
  return grid;
}

export async function deleteAdditionalSection(sectionId: string) {
  const section = await prisma.freeSection.findUniqueOrThrow({ where: { id: sectionId } });
  await requireMentor(section.studentId);
  await prisma.freeSection.delete({ where: { id: sectionId } });
}
