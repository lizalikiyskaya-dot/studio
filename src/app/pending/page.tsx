import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";

export default async function PendingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  if (user.status === "APPROVED") redirect("/dashboard/tasks");

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[440px] text-center">
        <div className="masthead-title font-semibold text-[19px] leading-tight">
          Студия художественной прозы
        </div>
        <span className="masthead-title italic text-[13px] block mt-0.5" style={{ color: "var(--ink-soft)" }}>
          Лизы Ликийской
        </span>
        <div className="masthead-rule mb-6">
          <div className="masthead-rule-line" />
          <div className="masthead-rule-line" />
        </div>

        {user.status === "PENDING" ? (
          <>
            <h1 className="text-[19px] font-semibold mb-3">Заявка на рассмотрении</h1>
            <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>
              Спасибо за регистрацию, {user.name}. Наставник проверит заявку и
              откроет доступ в личный кабинет. Это может занять некоторое время.
            </p>
          </>
        ) : user.status === "SUSPENDED" ? (
          <>
            <h1 className="text-[19px] font-semibold mb-3" style={{ color: "var(--wine)" }}>
              Доступ закрыт
            </h1>
            <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>
              Свяжитесь с наставником для возобновления доступа.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[19px] font-semibold mb-3" style={{ color: "var(--wine)" }}>
              Заявка отклонена
            </h1>
            <p className="text-[14px]" style={{ color: "var(--ink-soft)" }}>
              Свяжитесь с наставником, чтобы уточнить детали.
            </p>
          </>
        )}

        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
