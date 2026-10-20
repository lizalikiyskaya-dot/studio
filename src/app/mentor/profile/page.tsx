import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/features/profile/ProfileForm";
import MailFromForm from "@/features/profile/MailFromForm";
import PageHeader from "@/components/PageHeader";
import { loadMailSender } from "@/features/mail/actions";
import { senderSetupNotes, senderWarning, smtpPublicFromEnv } from "@/lib/mailSender";

export default async function MentorProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/profile");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const smtp = smtpPublicFromEnv();
  const sender = await loadMailSender();

  return (
    <div>
      <PageHeader title="Мой профиль" />
      <MailFromForm
        ready={sender.ready}
        initial={sender.sender}
        smtp={smtp}
        notes={senderSetupNotes(smtp)}
        warning={senderWarning(sender.sender, smtp)}
      />
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
