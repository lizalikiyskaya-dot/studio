import { prisma } from "@/lib/prisma";

/**
 * «Есть ли у наставника непросмотренные изменения по этому ученику».
 *
 * Раньше красный маячок у имени горел просто 24 часа после последней
 * правки ученика — посмотрела изменения, а он всё висит.
 *
 * Теперь считаем по двум сигналам, берём самый свежий из них:
 *
 *  1. Правка в разделе (SectionActivity, byRole=STUDENT), которая новее,
 *     чем момент последнего открытия ЭТОГО раздела наставником
 *     (SectionSeen) — то же, из чего сделаны маячки разделов.
 *  2. User.lastActivityAt новее, чем последний заход наставника в кабинет
 *     этого ученика вообще (максимум SectionSeen по всем разделам).
 *
 * Второй сигнал нужен, потому что посекционные отметки пишет только
 * слушатель input/change в отслеживаемых разделах — загрузка файла,
 * перетаскивание, правка профиля туда не попадают. На бою нашлись
 * ученицы, у которых правки есть, а посекционных отметок нет: на одном
 * первом сигнале маячок бы им не загорелся.
 *
 * Возвращает по ученику время самой свежей непросмотренной правки.
 */
export async function getUnseenActivity(
  viewerId: string,
  students: { id: string; lastActivityAt: Date | null }[]
): Promise<Record<string, Date>> {
  if (students.length === 0) return {};
  const studentIds = students.map((student) => student.id);

  const [activity, seen] = await Promise.all([
    prisma.sectionActivity.findMany({
      where: { studentId: { in: studentIds }, byRole: "STUDENT" },
    }),
    prisma.sectionSeen.findMany({
      where: { studentId: { in: studentIds }, userId: viewerId },
    }),
  ]);

  const seenSection = new Map<string, number>();
  const lastVisit = new Map<string, number>();
  for (const row of seen) {
    const at = row.seenAt.getTime();
    seenSection.set(`${row.studentId}:${row.section}`, at);
    lastVisit.set(row.studentId, Math.max(lastVisit.get(row.studentId) ?? 0, at));
  }

  const result: Record<string, Date> = {};
  const remember = (studentId: string, at: Date) => {
    const current = result[studentId];
    if (!current || at > current) result[studentId] = at;
  };

  for (const row of activity) {
    const viewed = seenSection.get(`${row.studentId}:${row.section}`) ?? 0;
    if (row.at.getTime() > viewed) remember(row.studentId, row.at);
  }

  for (const student of students) {
    if (!student.lastActivityAt) continue;
    const visited = lastVisit.get(student.id) ?? 0;
    if (student.lastActivityAt.getTime() > visited) {
      remember(student.id, student.lastActivityAt);
    }
  }

  return result;
}
