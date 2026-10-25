import { prisma } from "@/lib/prisma";
import { getCommentsForRecords } from "@/features/comments/actions";
import { getSuggestionsForRecords } from "@/features/suggestions/actions";
import { attachPortrait, photoIds } from "@/lib/portraits";
import { BELIEF_SEED } from "../belief/seedData";
import { POP_ARC_SEED } from "../popArcs/seedData";
import { STORY_CIRCLE_SEED } from "../storyCircle/seedData";
import ExerciseBoard, { type ArcItem, type BeliefItem, type CircleItem } from "./ExerciseBoard";

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") record[key] = item;
  }
  return record;
}

export default async function GraphView({
  studentId,
  isMentorViewer,
}: {
  studentId: string;
  isMentorViewer: boolean;
}) {
  const exampleArcs = await prisma.popArcCharacter.count({ where: { studentId, isExample: true } });
  if (exampleArcs === 0) {
    await prisma.popArcCharacter.createMany({
      data: POP_ARC_SEED.map((seed, index) => ({
        studentId,
        order: index,
        isExample: true,
        name: seed.name,
        arcType: seed.arcType,
        data: seed.data,
      })),
    });
  }

  const exampleBeliefs = await prisma.beliefCard.count({ where: { studentId, isExample: true } });
  if (exampleBeliefs === 0) {
    await prisma.beliefCard.createMany({
      data: BELIEF_SEED.map((seed, index) => ({ studentId, order: index, isExample: true, ...seed })),
    });
  }

  const exampleCircles = await prisma.storyCircleCard.count({ where: { studentId, isExample: true } });
  if (exampleCircles === 0) {
    await prisma.storyCircleCard.createMany({
      data: STORY_CIRCLE_SEED.map((seed, index) => ({
        studentId,
        order: index,
        isExample: true,
        hero: seed.hero,
        data: seed.data,
      })),
    });
  }

  const [arcs, beliefs, circles, arcPhotos, beliefPhotos, circlePhotos] = await Promise.all([
    prisma.popArcCharacter.findMany({ where: { studentId }, orderBy: { order: "asc" }, omit: { photoUrl: true } }),
    prisma.beliefCard.findMany({ where: { studentId }, orderBy: { order: "asc" }, omit: { photoUrl: true } }),
    prisma.storyCircleCard.findMany({ where: { studentId }, orderBy: { order: "asc" }, omit: { photoUrl: true } }),
    photoIds("pop-arc", studentId),
    photoIds("belief", studentId),
    photoIds("story-circle", studentId),
  ]);

  const arcItems: ArcItem[] = attachPortrait(arcs, arcPhotos, "pop-arc").map((item) => ({
    id: item.id,
    name: item.name,
    photoUrl: item.photoUrl,
    isExample: item.isExample,
    arcType: item.arcType,
    data: asRecord(item.data),
  }));
  const beliefItems: BeliefItem[] = attachPortrait(beliefs, beliefPhotos, "belief").map((item) => ({
    id: item.id,
    hero: item.hero,
    photoUrl: item.photoUrl,
    isExample: item.isExample,
    startBelief: item.startBelief,
    endBelief: item.endBelief,
  }));
  const circleItems: CircleItem[] = attachPortrait(circles, circlePhotos, "story-circle").map((item) => ({
    id: item.id,
    hero: item.hero,
    photoUrl: item.photoUrl,
    isExample: item.isExample,
    data: asRecord(item.data),
  }));

  const [arcComments, beliefComments, circleComments, arcSuggestions, beliefSuggestions, circleSuggestions] = await Promise.all([
    getCommentsForRecords("PopArcCharacter", arcItems.map((item) => item.id)),
    getCommentsForRecords("BeliefCard", beliefItems.map((item) => item.id)),
    getCommentsForRecords("StoryCircleCard", circleItems.map((item) => item.id)),
    getSuggestionsForRecords("PopArcCharacter", arcItems.map((item) => item.id)),
    getSuggestionsForRecords("BeliefCard", beliefItems.map((item) => item.id)),
    getSuggestionsForRecords("StoryCircleCard", circleItems.map((item) => item.id)),
  ]);

  return (
    <ExerciseBoard
      studentId={studentId}
      isMentorViewer={isMentorViewer}
      arcs={arcItems}
      beliefs={beliefItems}
      circles={circleItems}
      arcComments={arcComments}
      beliefComments={beliefComments}
      circleComments={circleComments}
      arcSuggestions={arcSuggestions}
      beliefSuggestions={beliefSuggestions}
      circleSuggestions={circleSuggestions}
    />
  );
}
