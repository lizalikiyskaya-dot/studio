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
    <div>
      <div className="text-[14px] capitalize" style={{ color: "var(--muted)" }}>{dateLabel}</div>
      <h1 className="page-title mt-1 mb-2">Ученики</h1>
      <p className="text-[15.5px] mb-6 max-w-[640px]" style={{ color: "var(--ink2)" }}>
        Новые ученики попадают сюда после регистрации и получают доступ в
        личный кабинет только после одобрения.
      </p>

      <div className="flex gap-3 mb-8 flex-wrap">
        <div className="rounded-[20px] px-5 py-3.5 text-white" style={{ background: "var(--deep)", flex: "1 1 160px" }}>
          <div className="text-[13px] text-white/70">Учеников</div>
          <div className="mt-1 text-[28px] font-semibold leading-none">{students.length}</div>
          <div className="mt-2 text-[12.5px] text-white/70">{onlineCount} сейчас онлайн</div>
        </div>
        <div className="rounded-[20px] px-5 py-3.5" style={{ background: "var(--soft)", flex: "1 1 160px" }}>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>Доступ открыт</div>
          <div className="mt-1 text-[28px] font-semibold leading-none">{openCount}</div>
          <div className="mt-2 text-[12.5px]" style={{ color: "var(--ink2)" }}>{awaitingCount} ожидает оплаты · {suspendedCount} закрыт</div>
        </div>
        <div className="rounded-[20px] px-5 py-3.5" style={{ background: "var(--soft)", flex: "1 1 160px" }}>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>Оплаты на этой неделе</div>
          <div className="mt-1 text-[28px] font-semibold leading-none">{paymentsThisWeek.length}</div>
          <div className="mt-2 text-[12.5px]" style={{ color: "var(--ink2)" }}>
            {paymentsThisWeek.length ? paymentsThisWeek.map((s) => `${s.paymentDay}-го`).join(" и ") : "нет дат на этой неделе"}
          </div>
        </div>
        <div className="rounded-[20px] px-5 py-3.5" style={{ background: "var(--soft)", flex: "1 1 160px" }}>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>Свежие правки</div>
          <div className="mt-1 text-[28px] font-semibold leading-none">{freshEdits}</div>
          <div className="mt-2 text-[12.5px]" style={{ color: "var(--ink2)" }}>непросмотренные изменения</div>
        </div>
      </div>

      <h2 className="heading text-[18px] font-semibold mb-3">
        Ожидают решения ({pending.length})
      </h2>

      {pending.length === 0 && (
        <p className="text-[14px] mb-8" style={{ color: "var(--muted)" }}>
          Новых заявок нет.
        </p>
      )}

      <table className="mentor-table w-full mb-10" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {pending.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid var(--rule)" }}>
              <td className="py-2.5 pr-3 text-[13.5px]">{u.name}</td>
              <td className="py-2.5 pr-3 text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
                {u.email}
              </td>
              <td className="py-2.5 text-right">
                <form action={approveUser.bind(null, u.id)} className="inline">
                  <Button variant="primary" pill className="mr-2">
                    Одобрить
                  </Button>
                </form>
                <form action={rejectUser.bind(null, u.id)} className="inline">
                  <Button variant="secondary" pill>Отклонить</Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="heading text-[18px] font-semibold mb-3">
        Ученики ({students.length})
      </h2>

      <StudentsList initialStudents={studentsWithBeacons} />

      <h2 className="heading text-[18px] font-semibold mb-3">
        Недавние решения
      </h2>
      <table className="mentor-table w-full">
        <tbody>
          {decided.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid var(--rule)" }}>
              <td className="py-2.5 pr-3 text-[13.5px]">{u.name}</td>
              <td className="py-2.5 pr-3 text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
                {u.email}
              </td>
              <td className="py-2.5 text-right">
                <Badge tone={u.status === "APPROVED" ? "success" : "danger"}>
                  {u.status === "APPROVED" ? "одобрено" : "отклонено"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
