import { prisma } from "@/lib/prisma";
import SubmissionsScreen from "./SubmissionsScreen";

export default async function SubmissionsView({ studentId }: { studentId: string }) {
  const rows = await prisma.submission.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <SubmissionsScreen
      studentId={studentId}
      contest={rows.filter((r) => r.type === "CONTEST")}
      publisher={rows.filter((r) => r.type === "PUBLISHER")}
    />
  );
}
