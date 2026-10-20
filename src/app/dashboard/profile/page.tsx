import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/features/profile/ProfileForm";
import PageHeader from "@/components/PageHeader";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const content = await loadContentEmailFlags(user.id);

  return (
    <div>
      <PageHeader title="Мой профиль" />
      <ProfileForm
        userId={user.id}
        initialName={user.name}
        initialEmail={user.email}
        initialAvatarUrl={user.avatarUrl ?? null}
        initialEmailNotifications={user.emailNotifications}
        initialWeeklyEmails={content.weeklyEmails}
        initialQuoteEmails={content.quoteEmails}
      />
    </div>
  );
}

async function loadContentEmailFlags(userId: string): Promise<{ weeklyEmails: boolean; quoteEmails: boolean }> {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyEmails: true, quoteEmails: true },
    });
    return { weeklyEmails: row?.weeklyEmails ?? true, quoteEmails: row?.quoteEmails ?? true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("weeklyEmails") || message.includes("quoteEmails") || message.includes("P2022")) {
      return { weeklyEmails: true, quoteEmails: true };
    }
    throw error;
  }
}
