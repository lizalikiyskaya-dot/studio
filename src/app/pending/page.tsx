import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import AuthShowcase from "@/components/AuthShowcase";
import { markedTitle } from "@/components/markedTitle";

export default async function PendingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/login");
  if (user.status === "APPROVED") redirect("/dashboard/tasks");

  return (
    <div className="auth-shell">
      <AuthShowcase />
      <div className="auth-panel">
        <div className="auth-card">
          {user.status === "PENDING" ? (
            <>
              <h1 className="auth-title">{markedTitle("Заявка на рассмотрении")}</h1>
              <p className="auth-sub">
                Спасибо за регистрацию, {user.name}. Наставник проверит заявку и
                откроет доступ в личный кабинет. Это может занять некоторое время.
                Вам придёт уведомление на почту.
              </p>
            </>
          ) : user.status === "SUSPENDED" ? (
            <>
              <h1 className="auth-title">{markedTitle("Доступ закрыт")}</h1>
              <p className="auth-sub">Свяжитесь с наставником для возобновления доступа.</p>
            </>
          ) : (
            <>
              <h1 className="auth-title">{markedTitle("Заявка отклонена")}</h1>
              <p className="auth-sub">Свяжитесь с наставником, чтобы уточнить детали.</p>
            </>
          )}
          <div className="mt-8">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
