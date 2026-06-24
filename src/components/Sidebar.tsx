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
    <div className="px-[18px] py-7 flex flex-col" style={{ minHeight: "calc(100vh - 40px)" }}>
      <div className="flex-1">
        <div className="mb-[26px]">
          <div className="masthead-title font-extrabold text-[19px] leading-tight">
            Студия художественной прозы
          </div>
          <span className="text-[12px] block mt-0.5" style={{ color: "var(--faded)" }}>
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
                  className={`nav-featured flex items-baseline gap-2 px-3 py-2.5 mb-1 text-[13.5px]${active ? " active" : ""}`}
                  style={{
                    background: "var(--wine)",
                    color: "#fff",
                  }}
                >
                  <span className="font-mono-label text-[10px]" style={{ color: "#F3C3CE" }}>→</span>
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
                  className={`nav-index-item flex items-baseline gap-2.5 px-2.5 py-2.5 text-[13.5px] mb-px${active ? " active" : ""}`}
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

      <div className="mt-6">
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
