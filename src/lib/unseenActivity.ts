import { prisma } from "@/lib/prisma";

/**
 * «Есть ли у наставника непросмотренные изменения по этому ученику».
 *
 * Раньше красный маячок у имени горел просто 24 часа после последней
 * правки ученика — посмотрел изменения, а он всё висит. Теперь это то же
 * самое, что и маячки разделов: правка ученика, которая новее, чем момент
 * последнего открытия этого раздела наставником.
 *
 * Возвращает по ученику время самой свежей НЕпросмотренной правки.
 */
export async function getUnseenActivity(
  viewerId: string,
  studentIds: string[]
): Promise<Record<string, Date>> {
  if (studentIds.length === 0) return {};

  const [activity, seen] = await Promise.all([
    prisma.sectionActivity.findMany({
      where: { studentId: { in: studentIds }, byRole: "STUDENT" },
    }),
    prisma.sectionSeen.findMany({
      where: { studentId: { in: studentIds }, userId: viewerId },
    }),
  ]);

  const seenAt = new Map(
    seen.map((s) => [`${s.studentId}:${s.section}`, s.seenAt.getTime()])
  );

  const result: Record<string, Date> = {};
  for (const row of activity) {
    const viewed = seenAt.get(`${row.studentId}:${row.section}`) ?? 0;
    if (row.at.getTime() <= viewed) continue;
    const current = result[row.studentId];
    if (!current || row.at > current) result[row.studentId] = row.at;
  }
  return result;
}
