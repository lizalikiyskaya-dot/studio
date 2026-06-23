import { prisma } from "@/lib/prisma";
import CustomExercisesList from "./CustomExercisesList";

export default async function CustomExercisesView({
  studentId,
  isMentorViewer,
}: {
  studentId: string;
  isMentorViewer: boolean;
}) {
  const exercises = await prisma.customExercise.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });

  return <CustomExercisesList studentId={studentId} initialExercises={exercises} isMentorViewer={isMentorViewer} />;
}
