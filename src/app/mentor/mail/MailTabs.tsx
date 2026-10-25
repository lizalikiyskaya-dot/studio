import Link from "next/link";

export const MAIL_TABS = [
  { id: "write", label: "Написать" },
  { id: "templates", label: "Шаблоны" },
  { id: "automatic", label: "Автоматические рассылки" },
  { id: "history", label: "История" },
] as const;

export type MailTab = (typeof MAIL_TABS)[number]["id"];

export function parseMailTab(value: string): MailTab {
  return MAIL_TABS.some((tab) => tab.id === value) ? (value as MailTab) : "write";
}

export function mailTabHref(tab: MailTab, type = "", student = "", base = "/mentor/mail") {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (type) params.set("type", type);
  if (student) params.set("student", student);
  return `${base}?${params.toString()}`;
}

export default function MailTabs({
  active,
  type = "",
  student = "",
  base = "/mentor/mail",
}: {
  active: MailTab;
  type?: string;
  student?: string;
  base?: string;
}) {
  return (
    <div className="mail-tabs-wrap">
      <nav className="mail-tabs" aria-label="Разделы писем">
        {MAIL_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={mailTabHref(tab.id, type, student, base)}
            className={tab.id === active ? "is-on" : undefined}
            aria-current={tab.id === active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
