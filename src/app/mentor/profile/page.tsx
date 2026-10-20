import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/features/profile/ProfileForm";
import MailFromForm from "@/features/profile/MailFromForm";
import PageHeader from "@/components/PageHeader";
import { loadMailSender } from "@/features/mail/actions";
import { senderWarning, smtpPublicFromEnv } from "@/lib/mailSender";

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
        warning={senderWarning(sender.sender, smtp) ?? (smtp.host.toLowerCase().includes("gmail") || smtp.host.toLowerCase().includes("google") ? "Другой адрес «От» Gmail примет, только если он добавлен как «Отправлять почту как»." : null)}
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
