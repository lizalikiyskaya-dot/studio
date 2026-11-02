import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadMentorFeed } from "@/lib/mentorFeedLoad";
import { MentorFeedPanel } from "@/features/mentorFeed/MentorFeed";

export default async function MentorNotificationsPage() {
  const session = await getSession();
  if (!session || session.role !== "MENTOR") redirect("/login");
  const items = await loadMentorFeed(session.userId);
  return (
    <div className="feed-page">
      <h1>Все уведомления</h1>
      <p className="feed-page-note">Здесь вся лента. Удаление прячет строку только у Вас, сдача ученика в кабинете остаётся.</p>
      <MentorFeedPanel items={items} showAllLink={false} />
    </div>
  );
}