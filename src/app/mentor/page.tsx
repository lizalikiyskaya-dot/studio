import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { approveUser, rejectUser } from "./actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import StudentsList from "./StudentsList";
import { markedTitle } from "@/components/markedTitle";
import { loadCurrentWork } from "@/lib/studentFocusData";
import { loadMentorFeed } from "@/lib/mentorFeedLoad";
import { loadAwaitingReview } from "@/lib/awaitingReviewLoad";
import { feedCounts, studentHint } from "@/lib/mentorFeed";
import { MentorDayCard } from "@/features/mentorFeed/MentorFeed";
import { AwaitingReview } from "@/features/mentorFeed/AwaitingReview";

export default async function MentorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/tasks");

  const mentor = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });

  // Один запрос вместо трёх. В клиент уходят только поля списка:
  // passwordHash и прочие служебные колонки в браузер не попадают.
  const people = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      paymentStatus: true,
      paymentDay: true,
      paymentAmount: true,
      paymentReminders: true,
      bookWorkshopUnlocked: true,
      storyWorkshopUnlocked: true,
      avatarUrl: true,
      lastSeenAt: true,
      lastActivityAt: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const pending = people
    .filter((s) => s.status === "PENDING")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const students = people
    .filter((s) => s.status === "APPROVED" || s.status === "SUSPENDED")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ru"));
  const [feed, awaiting] = await Promise.all([loadMentorFeed(session.userId), loadAwaitingReview()]);
  const counts = feedCounts(feed);
  const hintByStudent = new Map<string, { hint: string; href: string; at: string; kind: string; sourceId: string }>();
  for (const item of feed) {
    if (item.seen || hintByStudent.has(item.studentId)) continue;
    hintByStudent.set(item.studentId, {
      hint: studentHint(item),
      href: item.href,
      at: item.at,
      kind: item.kind,
      sourceId: item.sourceId,
    });
  }
  const currentWork = await loadCurrentWork(students.map((s) => s.id));
  const studentsWithBeacons = students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    status: s.status,
    paymentStatus: s.paymentStatus,
    paymentDay: s.paymentDay,
    paymentAmount: s.paymentAmount,
    paymentReminders: s.paymentReminders,
    bookWorkshopUnlocked: s.bookWorkshopUnlocked,
    storyWorkshopUnlocked: s.storyWorkshopUnlocked,
    avatarUrl: s.avatarUrl,
    lastSeenAt: s.lastSeenAt,
    lastActivityAt: s.lastActivityAt,
    unseenAt: hintByStudent.get(s.id) ? new Date(hintByStudent.get(s.id)!.at) : null,
    unseenHint: hintByStudent.get(s.id)?.hint ?? null,
    unseenHref: hintByStudent.get(s.id)?.href ?? null,
    unseenKind: hintByStudent.get(s.id)?.kind ?? null,
    unseenSourceId: hintByStudent.get(s.id)?.sourceId ?? null,
    currentWork: currentWork[s.id] ?? null,
  }));

  const decided = people
    .filter((s) => s.status === "APPROVED" || s.status === "REJECTED")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 20);

  const activeCount = students.filter((s) => s.status === "APPROVED").length;
  const openCount = students.filter((s) => s.status === "APPROVED" && s.paymentStatus === "PAID").length;
  const awaitingCount = students.filter((s) => s.status === "APPROVED" && s.paymentStatus !== "PAID").length;
  const suspendedCount = students.filter((s) => s.status === "SUSPENDED").length;
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekDays = new Set<number>();
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    if (day.getMonth() === today.getMonth()) weekDays.add(day.getDate());
  }
  const paymentsThisWeek = students.filter((s) => s.paymentDay != null && weekDays.has(s.paymentDay));
  const dateLabel = today.toLocaleDateString("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const hour = Number(
    new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "numeric", hourCycle: "h23" }).format(today),
  );
  const hello = hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const mentorName = mentor?.name?.trim().split(/\s+/)[0] || "наставник";

  return (
    <div>
      <div className="text-[14px] capitalize" style={{ color: "var(--muted)" }}>{dateLabel}</div>
      <h1 className="page-title mt-1 mb-5">{hello}, {markedTitle(mentorName)}</h1>
      <MentorDayCard items={feed} />
      <div className="mentor-stats">
        <div className="mentor-stat is-lead">
          <div className="mentor-stat-lbl">Ждут разбора</div>
          <div className="mentor-stat-num">{counts.action}</div>
          <div className="mentor-stat-sub">сдано и ещё не открыто</div>
        </div>
        <div className="mentor-stat">
          <div className="mentor-stat-lbl">Правки</div>
          <div className="mentor-stat-num">{counts.edits}</div>
          <div className="mentor-stat-sub">без сдачи, не открыты</div>
        </div>
        <div className="mentor-stat">
          <div className="mentor-stat-lbl">Новые заявки</div>
          <div className="mentor-stat-num">{pending.length}</div>
          <div className="mentor-stat-sub">ждут одобрения</div>
        </div>
        <div className="mentor-stat">
          <div className="mentor-stat-lbl">Оплаты</div>
          <div className="mentor-stat-num">{openCount} / {activeCount}</div>
          <div className="mentor-stat-sub">
            {awaitingCount} ждут оплаты
            {suspendedCount ? ` · ${suspendedCount} закрыт` : ""}
            {paymentsThisWeek.length ? ` · на неделе ${paymentsThisWeek.length}` : ""}
          </div>
        </div>
      </div>

      <div className="mentor-home-wrap">
      <div className="mentor-home">
        <StudentsList initialStudents={studentsWithBeacons} />
        <aside className="mentor-side">
          <section className="sheet p-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[16px] font-semibold">Новые заявки</h2>
              {pending.length > 0 && (
                <span className="rounded-full px-2 text-[12px] font-semibold text-white" style={{ background: "var(--v)" }}>{pending.length}</span>
              )}
            </div>
            {pending.length === 0 && <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>Новых заявок нет.</p>}
            <div className="flex flex-col gap-3">
              {pending.map((u) => (
                <div key={u.id} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold break-words">{u.name}</div>
                    <div className="truncate text-[12.5px]" style={{ color: "var(--muted)" }}>{u.email}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <form action={approveUser.bind(null, u.id)}>
                      <Button variant="primary" size="sm" pill>Одобрить</Button>
                    </form>
                    <form action={rejectUser.bind(null, u.id)}>
                      <button type="submit" className="text-[12.5px]" style={{ color: "var(--muted)" }}>Отклонить</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <AwaitingReview items={awaiting} now={new Date().toISOString()} />
          <section className="sheet p-4">
            <h2 className="text-[16px] font-semibold mb-2">Недавние решения</h2>
            {decided.length === 0 ? (
              <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>Решений пока нет.</p>
            ) : (
              decided.slice(0, 6).map((u) => (
                <div key={u.id} className="flex items-center gap-2 py-2" style={{ borderTop: "1px solid var(--line)" }}>
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">{u.name}</span>
                  <Badge tone={u.status === "APPROVED" ? "mint" : "danger"}>{u.status === "APPROVED" ? "одобрено" : "отклонено"}</Badge>
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
      </div>
    </div>
  );
}

