import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { approveUser, rejectUser } from "./actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import StudentsList from "./StudentsList";

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
  const decided = await prisma.user.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] }, role: "STUDENT" },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="page-title text-[28px] font-semibold mb-2">Модерация заявок</h1>
      <p className="text-[13px] mb-7 max-w-[640px]" style={{ color: "var(--faded)" }}>
        Новые ученики попадают сюда после регистрации и получают доступ в
        личный кабинет только после одобрения.
      </p>

      <h2 className="heading text-[15px] font-semibold mb-3" style={{ color: "var(--faded)" }}>
        Ожидают решения ({pending.length})
      </h2>

      {pending.length === 0 && (
        <p className="text-[13.5px] mb-8" style={{ color: "var(--faded)" }}>
          Новых заявок нет.
        </p>
      )}

      <table className="w-full mb-10" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {pending.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid var(--rule)" }}>
              <td className="py-2.5 pr-3 text-[13.5px]">{u.name}</td>
              <td className="py-2.5 pr-3 text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
                {u.email}
              </td>
              <td className="py-2.5 text-right">
                <form action={approveUser.bind(null, u.id)} className="inline">
                  <Button variant="success" pill className="mr-2">
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

      <h2 className="heading text-[15px] font-semibold mb-3" style={{ color: "var(--faded)" }}>
        Ученики ({students.length})
      </h2>

      <StudentsList initialStudents={students} />

      <h2 className="heading text-[15px] font-semibold mb-3" style={{ color: "var(--faded)" }}>
        Недавние решения
      </h2>
      <table className="w-full">
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
