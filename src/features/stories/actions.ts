"use server";

import { prisma } from "@/lib/prisma";
import { requireCabinetAccess, requireMentor } from "@/lib/access";
import type { CharacterSource, SettingSource } from "@/generated/prisma/client";
import { isChapterReview, type ChapterReviewValue } from "@/features/books/chapterReview";
import { creditStreakWeek } from "@/features/streak/credit";
import { submittedStatusCounts } from "@/features/streak/weeks";
import { appUrl } from "@/lib/mail";
import { queueMentorDigest, reviewGroup } from "@/lib/mentorDigest";

export async function createStory(cycleId: string) {
  const cycle = await prisma.cycle.findUniqueOrThrow({ where: { id: cycleId } });
  await requireCabinetAccess(cycle.studentId);
  const count = await prisma.story.count({ where: { cycleId } });
  return prisma.story.create({
    data: { cycleId, studentId: cycle.studentId, order: count },
  });
}

export async function createStandaloneStory(studentId: string) {
  await requireCabinetAccess(studentId);
  const count = await prisma.story.count({ where: { studentId, cycleId: null } });
  return prisma.story.create({
    data: { studentId, cycleId: null, order: count, characterSource: "OWN", settingSource: "OWN" },
  });
}

export async function deleteStory(storyId: string) {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.story.delete({ where: { id: storyId } });
}

export async function updateStoryTitle(storyId: string, title: string) {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.story.update({ where: { id: storyId }, data: { title } });
}

const STORY_STRUCTURE_FIELDS = [
  "setupText",
  "climaxText",
  "resolutionText",
  "characterPathText",
  "concept",
  "dramaticArgument",
  "genre",
  "logline",
] as const;
export type StoryStructureField = (typeof STORY_STRUCTURE_FIELDS)[number];

export async function updateStoryStructureField(
  storyId: string,
  field: StoryStructureField,
  value: string
) {
  if (!STORY_STRUCTURE_FIELDS.includes(field)) throw new Error("Недопустимое поле");
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.story.update({ where: { id: storyId }, data: { [field]: value } });
}

export async function setStoryCharacterSource(storyId: string, source: CharacterSource) {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.story.update({ where: { id: storyId }, data: { characterSource: source } });
}

export async function setStorySettingSource(storyId: string, source: SettingSource) {
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.story.update({ where: { id: storyId }, data: { settingSource: source } });
}

export async function updateStoryChars(
  storyId: string,
  field: "writtenChars" | "plannedChars",
  value: number,
) {
  if (field !== "writtenChars" && field !== "plannedChars") throw new Error("Недопустимое поле");
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  await requireCabinetAccess(story.studentId);
  await prisma.story.update({
    where: { id: storyId },
    data: { [field]: Math.max(0, Math.round(Number.isFinite(value) ? value : 0)) },
  });
}

export async function updateStoryReview(storyId: string, status: ChapterReviewValue) {
  if (!isChapterReview(status)) return;
  const story = await prisma.story.findUniqueOrThrow({ where: { id: storyId } });
  await requireMentor(story.studentId);
  if (story.reviewStatus === status) return;
  await prisma.story.update({ where: { id: storyId }, data: { reviewStatus: status } });
  if (submittedStatusCounts(story.reviewStatus, status)) await creditStreakWeek(story.studentId);
  const review = reviewGroup(status);
  if (review) {
    await queueMentorDigest({
      studentId: story.studentId,
      group: review,
      sourceId: `story:${story.id}`,
      title: story.title,
      url: `${appUrl()}/dashboard/stories#story-${story.id}`,
    });
  }
}
