"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";

export type NoteAnchor = { quote: string; label: string; url: string };

export async function createNote(studentId: string, text: string, anchor?: NoteAnchor) {
  const session = await requireCabinetAccess(studentId);
  const author = session.role === "MENTOR" ? "Наставник" : "Ученик";
  return prisma.note.create({
    data: {
      studentId,
      author,
      authorRole: session.role,
      text,
      anchorQuote: anchor?.quote ?? "",
      anchorLabel: anchor?.label ?? "",
      anchorUrl: anchor?.url ?? "",
    },
  });
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

export async function resolveNote(noteId: string) {
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  const session = await requireCabinetAccess(note.studentId);
  const resolvedBy = session.role === "MENTOR" ? "Наставник" : "Ученик";
  await prisma.note.update({
    where: { id: noteId },
    data: { resolved: true, resolvedAt: new Date(), resolvedBy },
  });
}

export async function reopenNote(noteId: string) {
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  await requireCabinetAccess(note.studentId);
  await prisma.note.update({
    where: { id: noteId },
    data: { resolved: false, resolvedAt: null, resolvedBy: "" },
  });
}
