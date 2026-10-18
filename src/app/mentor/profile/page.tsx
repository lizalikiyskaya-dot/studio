import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/features/profile/ProfileForm";
import PageHeader from "@/components/PageHeader";

export default async function MentorProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/profile");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <div>
      <PageHeader title="Мой профиль" description="Фото, имя, почта и пароль. Наставник видит здесь те же блоки." />
      <ProfileForm
        userId={user.id}
        initialName={user.name}
        initialEmail={user.email}
        initialAvatarUrl={user.avatarUrl ?? null}
        initialEmailNotifications={user.emailNotifications}
        isMentor
      />
    </div>
  );
}
