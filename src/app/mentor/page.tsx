import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { approveUser, rejectUser } from "./actions";

export default async function MentorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/tasks");

  const pending = await prisma.user.findMany({
    where: { status: "PENDING", role: "STUDENT" },
    orderBy: { createdAt: "asc" },
  });
  const students = await prisma.user.findMany({
    where: { status: "APPROVED", role: "STUDENT" },
    orderBy: { name: "asc" },
  });
  const decided = await prisma.user.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] }, role: "STUDENT" },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <div>
      <h1 className="text-[28px] font-semibold mb-2">Модерация заявок</h1>
      <p className="text-[13px] mb-7 max-w-[640px]" style={{ color: "var(--faded)" }}>
        Новые ученики попадают сюда после регистрации и получают доступ в
        личный кабинет только после одобрения.
      </p>

      <h2 className="font-mono-label text-[10.5px] uppercase tracking-wide mb-3" style={{ color: "var(--faded)" }}>
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
                  <button
                    className="font-mono-label text-[10.5px] px-3 py-1.5 rounded-sm mr-2"
                    style={{ background: "var(--sage)", color: "#fff" }}
                  >
                    Одобрить
                  </button>
                </form>
                <form action={rejectUser.bind(null, u.id)} className="inline">
                  <button
                    className="font-mono-label text-[10.5px] px-3 py-1.5 rounded-sm"
                    style={{ border: "1px solid var(--wine)", color: "var(--wine)" }}
                  >
                    Отклонить
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="font-mono-label text-[10.5px] uppercase tracking-wide mb-3" style={{ color: "var(--faded)" }}>
        Ученики ({students.length})
      </h2>

      {students.length === 0 && (
        <p className="text-[13.5px] mb-8" style={{ color: "var(--faded)" }}>
          Пока нет одобренных учеников.
        </p>
      )}

      <table className="w-full mb-10" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid var(--rule)" }}>
              <td className="py-2.5 pr-3 text-[13.5px]">{s.name}</td>
              <td className="py-2.5 pr-3 text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
                {s.email}
              </td>
              <td className="py-2.5 text-right">
                <Link
                  href={`/student-view/${s.id}/tasks`}
                  className="font-mono-label text-[10.5px] px-3 py-1.5 rounded-sm inline-block"
                  style={{ background: "var(--wine)", color: "#fff" }}
                >
                  Открыть кабинет
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="font-mono-label text-[10.5px] uppercase tracking-wide mb-3" style={{ color: "var(--faded)" }}>
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
                <span
                  className="font-mono-label text-[10.5px] px-2.5 py-1 rounded-full"
                  style={{
                    color: u.status === "APPROVED" ? "var(--sage)" : "var(--wine)",
                    border: `1px solid ${u.status === "APPROVED" ? "var(--sage)" : "var(--wine)"}`,
                  }}
                >
                  {u.status === "APPROVED" ? "одобрено" : "отклонено"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
