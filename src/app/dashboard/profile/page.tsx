import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/features/profile/ProfileForm";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <div>
      <h1 className="page-title text-[28px] font-semibold mb-7">Мой профиль</h1>
      <ProfileForm
        userId={user.id}
        initialName={user.name}
        initialEmail={user.email}
        initialAvatarUrl={user.avatarUrl ?? null}
      />
    </div>
  );
}
