import { prisma } from "@/lib/prisma";
import OpenCallsTable from "@/features/openCalls/OpenCallsTable";
import SubmissionsScreen from "@/features/submissions/SubmissionsScreen";
import PublicationsScreen from "./PublicationsScreen";

export default async function PublicationsPage({
  studentId,
  tab,
}: {
  studentId: string;
  tab: "calls" | "tracker";
}) {
  const [calls, rows] = await Promise.all([
    prisma.openCall.findMany({ where: { studentId }, orderBy: { order: "asc" } }),
    prisma.submission.findMany({ where: { studentId }, orderBy: { order: "asc" } }),
  ]);

  return (
    <PublicationsScreen
      tab={tab}
      calls={<OpenCallsTable studentId={studentId} initial={calls} />}
      tracker={
        <SubmissionsScreen
          studentId={studentId}
          contest={rows.filter((row) => row.type === "CONTEST")}
          publisher={rows.filter((row) => row.type === "PUBLISHER")}
        />
      }
    />
  );
}
