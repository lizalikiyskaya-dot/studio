import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadStudentFeed } from "@/lib/studentFeedLoad";
import { StudentFeedList } from "@/features/studentFeed/StudentBell";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");
  const items = await loadStudentFeed(session.userId, { full: true });
  return (
    <section className="sheet feed-page" aria-label="Все уведомления">
      <h1>Все уведомления</h1>
      <p className="feed-page-note">Здесь вся история. Удаление прячет строку только у Вас, задание и заметка в кабинете остаются.</p>
      <StudentFeedList items={items} mode="page" />
    </section>
  );
}
