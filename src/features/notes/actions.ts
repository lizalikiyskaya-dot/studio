"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export async function createNote(studentId: string, text: string) {
  const session = await requireCabinetAccess(studentId);
  const author = session.role === "MENTOR" ? "Наставник" : "Ученик";
  return prisma.note.create({ data: { studentId, author, text } });
}

export async function updateNote(noteId: string, text: string) {
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  await requireCabinetAccess(note.studentId);
  await prisma.note.update({ where: { id: noteId }, data: { text } });
}

export async function deleteNote(noteId: string) {
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  await requireCabinetAccess(note.studentId);
  await prisma.note.delete({ where: { id: noteId } });
}
