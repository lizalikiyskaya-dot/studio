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

  const pending = await prisma.user.findMany({
    where: { status: "PENDING", role: "STUDENT" },
    orderBy: { createdAt: "asc" },
  });
  const students = await prisma.user.findMany({
    where: { status: { in: ["APPROVED", "SUSPENDED"] }, role: "STUDENT" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  // Маячок у имени = непросмотренные правки ученика (см. lib/unseenActivity).
  const unseen = await getUnseenActivity(
    session.userId,
    students.map((s) => s.id)
  );
  const studentsWithBeacons = students.map((s) => ({
    ...s,
    unseenAt: unseen[s.id] ?? null,
  }));

  const decided = await prisma.user.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] }, role: "STUDENT" },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

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
    <div className="mentor-layout">
      <aside className="flex flex-col gap-4">
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
                <div className="text-[14.5px] font-semibold">{u.name}</div>
                <div className="text-[12.5px] truncate" style={{ color: "var(--muted)" }}>{u.email}</div>
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
              <span className="text-[13.5px] truncate">{u.name}</span>
              <Badge tone={u.status === "APPROVED" ? "success" : "danger"}>{u.status === "APPROVED" ? "одобрено" : "отклонено"}</Badge>
            </div>
          ))}
        </section>
        <p className="text-[13px] leading-snug px-1" style={{ color: "var(--muted)" }}>
          Письма о новых заявках и сданных работах будут приходить на почту <span className="soon">скоро</span>
        </p>
      </aside>

      <div>
        <div className="text-[14px] capitalize" style={{ color: "var(--muted)" }}>{dateLabel}</div>
        <h1 className="page-title mt-1 mb-5">Ученики</h1>
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
