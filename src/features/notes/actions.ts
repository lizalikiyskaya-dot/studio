"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess } from "@/lib/access";
import { queueCabinetChange } from "@/lib/activityDigest";
import { noteUrl, queueMentorDigest } from "@/lib/mentorDigest";

function sectionFromUrl(url: string): string {
  const match = /\/(?:dashboard|student-view\/[^/]+)\/([a-z-]+)/.exec(url);
  return match?.[1] || "notes";
}

export type NoteAnchor = { quote: string; label: string; url: string };

export async function createNote(studentId: string, text: string, anchor?: NoteAnchor) {
  const session = await requireCabinetAccess(studentId);
  const author = session.role === "MENTOR" ? "Наставник" : "Ученик";
  const note = await prisma.note.create({
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
  if (session.role === "MENTOR") {
    await queueMentorDigest({
      studentId,
      group: "note",
      sourceId: note.id,
      title: text,
      url: noteUrl(anchor?.url),
    });
  } else {
    await queueCabinetChange({
      studentId,
      byMentor: false,
      section: sectionFromUrl(anchor?.url ?? ""),
      detail: "Заметка",
    });
  }
  return note;
}

export async function updateNote(noteId: string, text: string) {
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  const session = await requireCabinetAccess(note.studentId);
  if (text.trim() === note.text.trim()) return;
  await prisma.note.update({ where: { id: noteId }, data: { text } });
  if (session.role === "MENTOR") {
    await queueMentorDigest({
      studentId: note.studentId,
      group: "note",
      sourceId: note.id,
      title: text,
      url: noteUrl(note.anchorUrl),
    });
    return;
  }
  await queueCabinetChange({
    studentId: note.studentId,
    byMentor: false,
    section: sectionFromUrl(note.anchorUrl),
    detail: "Заметка",
  });
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

export async function pollNotes(studentId: string) {
  await requireCabinetAccess(studentId);
  const notes = await prisma.note.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } });
  const rows = notes.length
    ? await prisma.comment.findMany({
        where: { model: "Note", recordId: { in: notes.map((note) => note.id) } },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const comments: Record<string, typeof rows> = {};
  for (const row of rows) {
    comments[row.recordId] ??= [];
    comments[row.recordId].push(row);
  }
  return { notes, comments };
}

export async function reopenNote(noteId: string) {
  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } });
  await requireCabinetAccess(note.studentId);
  await prisma.note.update({
    where: { id: noteId },
    data: { resolved: false, resolvedAt: null, resolvedBy: "" },
  });
}
