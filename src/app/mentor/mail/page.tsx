import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { markedTitle } from "@/components/markedTitle";
import EmptyState from "@/components/EmptyState";
import { EMAIL_TYPE_LABEL, emailTypeLabel } from "@/lib/emailTypes";
import MailFilters from "./MailFilters";
import ComposeMail from "./ComposeMail";
import AutomaticMail from "./AutomaticMail";
import MailFromForm from "@/features/profile/MailFromForm";
import { loadMailSender } from "@/features/mail/actions";
import { mailFrom } from "@/lib/mail";
import { parseAddress, senderWarning, smtpPublicFromEnv } from "@/lib/mailSender";
import { readBroadcastList } from "@/lib/mailBroadcastStore";
import { broadcastPreviewHtml } from "@/lib/broadcastPreviews";

const SEOUL = "Asia/Seoul";

function seoulTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: SEOUL,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function one(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

export default async function MentorMailPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; student?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "MENTOR") redirect("/dashboard/tasks");

  const params = await searchParams;
  const type = one(params.type);
  const student = one(params.student);

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, email: true, status: true },
    orderBy: { name: "asc" },
  });
  const recipients = students
    .filter((student) => student.status === "APPROVED" && student.email.includes("@"))
    .map((student) => ({ id: student.id, name: student.name, email: student.email }));

  let ready = true;
  let rows: {
    id: string;
    createdAt: Date;
    type: string;
    recipientEmail: string;
    subject: string;
    status: string;
    error: string | null;
    html: string;
    recipient: { name: string } | null;
  }[] = [];
  let knownTypes: string[] = Object.keys(EMAIL_TYPE_LABEL);

  try {
    const where: { type?: string; recipientUserId?: string } = {};
    if (type) where.type = type;
    if (student) where.recipientUserId = student;
    const [found, distinct] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: { recipient: { select: { name: true } } },
      }),
      prisma.emailLog.findMany({ distinct: ["type"], select: { type: true } }),
    ]);
    rows = found;
    const extra = distinct.map((item) => item.type).filter((item) => !knownTypes.includes(item));
    knownTypes = [...knownTypes, ...extra];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.includes("EmailLog")) throw error;
    ready = false;
  }

  const types = knownTypes.map((value) => ({ value, label: emailTypeLabel(value) }));
  const smtp = smtpPublicFromEnv();
  const sender = await loadMailSender();
  const envFrom = parseAddress(mailFrom());
  const envText = envFrom.email ? `${envFrom.name || "Сервер"} <${envFrom.email}>` : mailFrom();
  const fromOptions: { id: "env" | "profile"; label: string }[] = [
    { id: "env", label: `Адрес сервера: ${envText}` },
  ];
  if (sender.sender.fromEmail) {
    const savedName = sender.sender.fromName.trim() || "Сохранённый адрес";
    fromOptions.push({ id: "profile", label: `${savedName} <${sender.sender.fromEmail}>` });
  }
  const broadcasts = await readBroadcastList();
  const warning = senderWarning(sender.sender, smtp)
    ?? (smtp.host.toLowerCase().includes("gmail") || smtp.host.toLowerCase().includes("google")
      ? "Другой адрес «От» Gmail примет, только если он добавлен как «Отправлять почту как»."
      : null);

  return (
    <div>
      <h1 className="page-title mt-1 mb-4">{markedTitle("Письма")}</h1>
      <ComposeMail students={recipients} fromOptions={fromOptions} />
      <MailFromForm ready={sender.ready} initial={sender.sender} smtp={smtp} warning={warning} />
      <AutomaticMail
        ready={broadcasts.ready}
        initial={broadcasts.rows}
        students={recipients.map((item) => ({ id: item.id, name: item.name }))}
        previews={broadcastPreviewHtml()}
      />
      <MailFilters type={type} student={student} types={types} students={students} />
      {!ready ? (
        <div className="rounded-[24px] px-5 py-4" style={{ background: "var(--soft)" }}>
          <p className="text-[15px]">Журнал ещё не подключен.</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState cue="Писем ещё не было" />
      ) : (
        <>
          <div className="sheet hidden min-[760px]:block">
            <table>
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Кому</th>
                  <th>Тема</th>
                  <th>Время</th>
                  <th>Статус</th>
                  <th>Письмо</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} data-email-row={row.id}>
                    <td>{emailTypeLabel(row.type)}</td>
                    <td>
                      <div className="font-medium">{row.recipient?.name ?? row.recipientEmail}</div>
                      {row.recipient?.name ? (
                        <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                          {row.recipientEmail}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ maxWidth: 360 }}>{row.subject}</td>
                    <td className="whitespace-nowrap" data-seoul-time={row.createdAt.toISOString()}>
                      {seoulTime(row.createdAt)}
                    </td>
                    <td>
                      <Status status={row.status} error={row.error} />
                    </td>
                    <td>
                      <LetterPreview html={row.html} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-3 min-[760px]:hidden">
            {rows.map((row) => (
              <li
                key={row.id}
                data-email-row={row.id}
                className="rounded-[14px] px-4 py-3"
                style={{ background: "#fff", border: "1px solid var(--border)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                      {emailTypeLabel(row.type)}
                    </div>
                    <div className="mt-0.5 font-semibold leading-snug">{row.subject}</div>
                  </div>
                  <Status status={row.status} error={null} />
                </div>
                <div className="mt-2 text-[13px]">
                  {row.recipient?.name ?? row.recipientEmail}
                  {row.recipient?.name ? (
                    <span style={{ color: "var(--muted)" }}> · {row.recipientEmail}</span>
                  ) : null}
                </div>
                <div className="mt-1 text-[12px]" style={{ color: "var(--muted)" }} data-seoul-time={row.createdAt.toISOString()}>
                  {seoulTime(row.createdAt)}
                </div>
                <LetterPreview html={row.html} />
                {row.error ? (
                  <div className="mt-1 text-[12px]" style={{ color: "var(--muted)" }}>
                    {row.error}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function LetterPreview({ html }: { html: string }) {
  if (!html) return <span className="text-[12px]" style={{ color: "var(--muted)" }}>нет текста</span>;
  return (
    <details className="mt-2 min-[760px]:mt-0">
      <summary className="cursor-pointer text-[13px]">Посмотреть</summary>
      <iframe
        title="Письмо"
        sandbox=""
        srcDoc={html}
        className="mt-2 w-full rounded-[12px]"
        style={{ height: 420, border: "1px solid var(--border)", background: "#F6F1E8" }}
      />
    </details>
  );
}

function Status({ status, error }: { status: string; error: string | null }) {
  const sent = status === "sent";
  return (
    <div>
      <span
        className="inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[12px]"
        data-email-status={status}
        style={
          sent
            ? { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" }
            : { background: "var(--pill-red-bg)", color: "var(--pill-red-fg)" }
        }
      >
        {sent ? "ушло" : "не ушло"}
      </span>
      {error ? (
        <div className="mt-1 max-w-[220px] text-[12px]" style={{ color: "var(--muted)" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
