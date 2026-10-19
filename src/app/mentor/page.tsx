import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { approveUser, rejectUser } from "./actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import StudentsList from "./StudentsList";
import { getUnseenActivity } from "@/lib/unseenActivity";

export default async function MentorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/tasks");

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
  // Маячок у имени = непросмотренные правки ученика (см. lib/unseenActivity).
  const unseen = await getUnseenActivity(session.userId, students);
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
    unseenAt: unseen[s.id] ?? null,
  }));

  const decided = people
    .filter((s) => s.status === "APPROVED" || s.status === "REJECTED")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 20);

  const openCount = students.filter((s) => s.status === "APPROVED" && s.paymentStatus === "PAID").length;
  const awaitingCount = students.filter((s) => s.status === "APPROVED" && s.paymentStatus !== "PAID").length;
  const suspendedCount = students.filter((s) => s.status === "SUSPENDED").length;
  const nowMs = new Date().getTime();
  const onlineCount = students.filter((s) => s.lastSeenAt && nowMs - new Date(s.lastSeenAt).getTime() < 3 * 60_000).length;
  const freshEdits = studentsWithBeacons.filter((s) => s.unseenAt).length;
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
  const dateLabel = today.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <div className="text-[14px] capitalize" style={{ color: "var(--muted)" }}>{dateLabel}</div>
      <h1 className="page-title mt-1 mb-5">Ученики</h1>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="sheet p-4">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="serif text-[18px] font-medium">Новые заявки</h2>
            {pending.length > 0 && (
              <span className="rounded-full px-2 text-[12px] font-semibold text-white" style={{ background: "var(--v)" }}>{pending.length}</span>
            )}
          </div>
          {pending.length === 0 && <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>Новых заявок нет.</p>}
          <div className="flex flex-col gap-3">
            {pending.map((u) => (
              <div key={u.id} className="rounded-[16px] p-3" style={{ background: "#F7FBF8" }}>
                <div className="text-[14.5px] font-semibold break-words">{u.name}</div>
                <div className="truncate text-[12.5px]" style={{ color: "var(--muted)" }}>{u.email}</div>
                <div className="mt-2 flex items-center gap-3">
                  <form action={approveUser.bind(null, u.id)}>
                    <Button variant="primary" pill>Одобрить</Button>
                  </form>
                  <form action={rejectUser.bind(null, u.id)}>
                    <button type="submit" className="text-[13.5px]" style={{ color: "var(--muted)" }}>Отклонить</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="sheet p-4">
          <h2 className="serif text-[18px] font-medium mb-2">Недавние решения</h2>
          {decided.slice(0, 6).map((u) => (
            <div key={u.id} className="flex items-center gap-2 py-2" style={{ borderTop: "1px solid var(--line)" }}>
              <span className="min-w-0 flex-1 truncate text-[13.5px]">{u.name}</span>
              <Badge tone={u.status === "APPROVED" ? "success" : "danger"}>{u.status === "APPROVED" ? "одобрено" : "отклонено"}</Badge>
            </div>
          ))}
          <p className="mt-3 text-[13px] leading-snug" style={{ color: "var(--muted)" }}>
            Письма о новых заявках и сданных работах будут приходить на почту <span className="soon">скоро</span>
          </p>
        </section>
      </div>

      <div>
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="rounded-[20px] px-5 py-3.5 text-white" style={{ background: "var(--deep)", flex: "1 1 150px" }}>
            <div className="text-[13px] text-white/70">Учеников</div>
            <div className="mt-1 text-[28px] font-semibold leading-none">{students.length}</div>
            <div className="mt-2 text-[12.5px] text-white/70">{onlineCount} сейчас онлайн</div>
          </div>
          <div className="rounded-[20px] px-5 py-3.5" style={{ background: "var(--soft)", flex: "1 1 150px" }}>
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>Доступ открыт</div>
            <div className="mt-1 text-[28px] font-semibold leading-none">{openCount}</div>
            <div className="mt-2 text-[12.5px]" style={{ color: "var(--ink2)" }}>{awaitingCount} ожидает оплаты · {suspendedCount} закрыт</div>
          </div>
          <div className="rounded-[20px] px-5 py-3.5" style={{ background: "var(--soft)", flex: "1 1 150px" }}>
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>Оплаты на этой неделе</div>
            <div className="mt-1 text-[28px] font-semibold leading-none">{paymentsThisWeek.length}</div>
            <div className="mt-2 text-[12.5px]" style={{ color: "var(--ink2)" }}>
              {paymentsThisWeek.length ? paymentsThisWeek.map((s) => `${s.paymentDay}-го`).join(" и ") : "нет дат на этой неделе"}
            </div>
          </div>
          <div className="rounded-[20px] px-5 py-3.5" style={{ background: "var(--soft)", flex: "1 1 150px" }}>
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>Свежие правки</div>
            <div className="mt-1 text-[28px] font-semibold leading-none">{freshEdits}</div>
            <div className="mt-2 text-[12.5px]" style={{ color: "var(--ink2)" }}>за последние сутки</div>
          </div>
        </div>
        <StudentsList initialStudents={studentsWithBeacons} />
      </div>
    </div>
  );
}
