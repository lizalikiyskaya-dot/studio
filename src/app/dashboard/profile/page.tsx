import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/features/profile/ProfileForm";
import PageHeader from "@/components/PageHeader";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <div>
      <PageHeader title="Мой профиль" />
      <ProfileForm
        userId={user.id}
        initialName={user.name}
        initialEmail={user.email}
        initialAvatarUrl={user.avatarUrl ?? null}
        initialEmailNotifications={user.emailNotifications}
      />
    </div>
  );
}
