"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import CalendarWidget from "./CalendarWidget";

const TOP_ITEMS = [
  { path: "tasks", label: "Задания и обратная связь" },
  { path: "materials", label: "Материалы" },
  { path: "drafts", label: "Рукописи" },
  { path: "exercises", label: "Упражнения" },
];

const WORKSHOP_ITEMS = [
  { path: "about", n: "01", label: "О книге" },
  { path: "plan", n: "02", label: "План книги" },
  { path: "acts", n: "03", label: "Акты и сюжетные линии" },
  { path: "dossier", n: "04", label: "Досье персонажей" },
  { path: "arcs", n: "05", label: "Арки персонажей" },
  { path: "setting", n: "06", label: "Сеттинг" },
];

export default function Sidebar({
  basePath,
  userName,
  isMentor,
  mentorViewLabel,
  mentorMenuOnly,
  calendar,
}: {
  basePath: string;
  userName: string;
  isMentor: boolean;
  mentorViewLabel?: string;
  mentorMenuOnly?: boolean;
  calendar?: {
    tasks: { id: string; title: string; deadline: string }[];
    paymentDay: number | null;
    paymentStatus: "PAID" | "PENDING";
  };
}) {
  const pathname = usePathname();

  return (
    <div
      className="border-r flex flex-col min-h-full px-5 py-8"
      style={{ borderColor: "var(--rule)" }}
    >
      <div className="flex-1">
        <div className="mb-8">
          <div className="masthead-title font-semibold text-[17px] leading-tight">
            Студия художественной прозы
          </div>
          <span className="masthead-title italic text-[12.5px] block mt-0.5" style={{ color: "var(--ink-soft)" }}>
            Лизы Ликийской
          </span>
          <div className="masthead-rule">
            <div className="masthead-rule-line" />
            <div className="masthead-rule-line" />
          </div>
        </div>

        {mentorViewLabel ? (
          <Link
            href="/mentor"
            className="block font-mono-label text-[9.5px] uppercase tracking-wide mb-7"
            style={{ color: "var(--wine)" }}
          >
            ← к ученикам · {mentorViewLabel}
          </Link>
        ) : (
          <span className="font-mono-label text-[9.5px] uppercase tracking-wide block mb-7" style={{ color: "var(--faded)" }}>
            {mentorMenuOnly ? "кабинет наставника" : "кабинет ученика"}
          </span>
        )}

        {isMentor && !mentorViewLabel && (
          <Link
            href="/mentor"
            className="block text-[13px] mb-2 px-2.5 py-2 rounded-sm font-mono-label uppercase tracking-wide"
            style={{
              background: pathname === "/mentor" ? "var(--ink)" : "var(--sage)",
              color: "#fff",
            }}
          >
            Ученики
          </Link>
        )}

        {!mentorMenuOnly && (
          <>
            {TOP_ITEMS.map((item) => {
              const href = `${basePath}/${item.path}`;
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={item.path}
                  href={href}
                  className="flex items-baseline gap-2 px-2.5 py-2.5 mb-1 rounded-sm text-[13.5px]"
                  style={{
                    background: active ? "var(--ink)" : "var(--wine)",
                    color: "#fff",
                  }}
                >
                  <span className="font-mono-label text-[10px]">→</span>
                  {item.label}
                </Link>
              );
            })}

            <div className="h-px my-[18px]" style={{ background: "var(--rule)" }} />
            <div className="font-mono-label text-[9.5px] uppercase tracking-wide mb-2.5" style={{ color: "var(--faded)" }}>
              Мастерская книги
            </div>

            {WORKSHOP_ITEMS.map((item) => {
              const href = `${basePath}/${item.path}`;
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={item.path}
                  href={href}
                  className="flex items-baseline gap-2 py-2 text-[13.5px]"
                  style={{ color: active ? "var(--wine)" : "var(--ink-soft)" }}
                >
                  <span className="font-mono-label text-[10px] font-semibold" style={{ color: active ? "var(--wine)" : "var(--ink)" }}>
                    {item.n}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </>
        )}

        {calendar && (
          <CalendarWidget
            tasks={calendar.tasks}
            paymentDay={calendar.paymentDay}
            paymentStatus={calendar.paymentStatus}
          />
        )}
      </div>

      <div>
        <div className="h-px mb-3.5" style={{ background: "var(--rule)" }} />
        <div className="flex items-center justify-between pt-3.5">
          <span className="text-[13.5px]" style={{ color: "var(--ink-soft)" }}>
            {userName}
          </span>
          {!mentorViewLabel && <LogoutButton />}
        </div>
      </div>
    </div>
  );
}
