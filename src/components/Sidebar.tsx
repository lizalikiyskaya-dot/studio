"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark, BookOpen, FileText, Pencil, PanelLeft } from "lucide-react";
import LogoutButton from "./LogoutButton";
import CalendarWidget from "./CalendarWidget";
import ToggleSwitch from "./ToggleSwitch";
import { setReviewMode } from "@/features/reviewMode/actions";
import { useCanSuggest, useSetCanSuggest } from "@/features/suggestions/SuggestionContext";

const TOP_ITEMS = [
  { path: "tasks", label: "Задания", icon: Bookmark },
  { path: "materials", label: "Материалы", icon: BookOpen },
  { path: "drafts", label: "Рукописи", icon: FileText },
  { path: "exercises", label: "Упражнения", icon: Pencil },
];

const WORKSHOP_ITEMS = [
  { path: "about", n: "01", label: "О книге" },
  { path: "plan", n: "02", label: "Трекер по главам" },
  { path: "acts", n: "03", label: "План книги" },
  { path: "dossier", n: "04", label: "Досье персонажей" },
  { path: "arcs", n: "05", label: "Арки персонажей" },
  { path: "setting", n: "06", label: "Сеттинг" },
];

const STORY_WORKSHOP_ITEMS = [{ path: "cycles", n: "01", label: "Циклы и рассказы" }];

const COLLAPSE_KEY = "sidebar-collapsed";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function Sidebar({
  basePath,
  userName,
  isMentor,
  mentorViewLabel,
  mentorMenuOnly,
  calendar,
  studentId,
  bookWorkshopUnlocked,
  storyWorkshopUnlocked,
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
  studentId?: string;
  bookWorkshopUnlocked?: boolean;
  storyWorkshopUnlocked?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bookParam = searchParams.get("book");
  const cycleParam = searchParams.get("cycle");
  const reviewMode = useCanSuggest();
  const setReviewModeState = useSetCanSuggest();
  const [, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Reads localStorage to sync collapse state after mount — must stay
    // false on the server/first paint to avoid a hydration mismatch, so
    // this can't be a useState initializer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      }
      return next;
    });
  }

  function handleToggleReviewMode(checked: boolean) {
    setReviewModeState(checked);
    if (studentId) startTransition(() => setReviewMode(studentId, checked));
  }

  return (
    <aside
      className="px-3 py-[22px] flex flex-col flex-shrink-0"
      style={{
        width: collapsed ? 60 : 220,
        minHeight: "100vh",
        background: "var(--paper)",
        borderRight: "1px solid var(--rule)",
        transition: "width 0.22s ease",
      }}
    >
      <div className="flex-1 overflow-hidden">
        <div className={`flex items-start gap-2 ${collapsed ? "justify-center" : "justify-between"} px-2.5 pt-1.5 mb-3.5`}>
          {!collapsed && (
            <div>
              <div className="masthead-title text-[15px] leading-tight font-bold">Студия художественной прозы</div>
              <span className="masthead-title text-[12px] block mt-0.5" style={{ color: "var(--faded)", fontWeight: 400 }}>
                Лизы Ликийской
              </span>
              <div className="masthead-rule">
                <div className="masthead-rule-line" />
                <div className="masthead-rule-line" />
              </div>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center flex-shrink-0 rounded-[9px]"
            style={{ width: 30, height: 30, background: "var(--neutral-active)", border: "1px solid var(--rule)", color: "var(--ink-soft)" }}
            title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          >
            <PanelLeft size={14} style={{ transform: collapsed ? "rotate(180deg)" : undefined }} />
          </button>
        </div>

        {!collapsed && (
          <>
            {mentorViewLabel ? (
              <Link href="/mentor" className="block text-[12.5px] mb-3.5 px-2.5" style={{ color: "var(--wine)" }}>
                ← к ученикам · {mentorViewLabel}
              </Link>
            ) : (
              <span className="block text-[12.5px] mb-3.5 px-2.5" style={{ color: "var(--faded)" }}>
                {mentorMenuOnly ? "кабинет наставника" : "кабинет ученика"}
              </span>
            )}

            {studentId && !mentorMenuOnly && isMentor && (
              <div
                className="flex items-center justify-between mb-2.5 px-2.5 py-2 rounded-[9px]"
                style={{ background: "#fff" }}
              >
                <ToggleSwitch checked={reviewMode} onChange={handleToggleReviewMode} label="Режим правок" />
              </div>
            )}

            {isMentor && !mentorViewLabel && (
              <Link
                href="/mentor"
                className="block text-[13px] mb-2.5 px-2.5 py-2 rounded-[9px]"
                style={{
                  background: pathname === "/mentor" ? "var(--ink)" : "var(--sage)",
                  color: "#fff",
                }}
              >
                Ученики
              </Link>
            )}
          </>
        )}

        {!mentorMenuOnly && (
          <>
            <div className="mb-3.5">
              {TOP_ITEMS.map((item) => {
                const href = `${basePath}/${item.path}`;
                const active = pathname?.startsWith(href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={href}
                    title={collapsed ? item.label : undefined}
                    className={`nav-item flex items-center gap-2.5 px-2.5 py-[9px] text-[13.5px] mb-0.5${active ? " active" : ""}${collapsed ? " justify-center" : ""}`}
                  >
                    <Icon size={17} style={{ flexShrink: 0, opacity: 0.85 }} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>

            {bookWorkshopUnlocked && (
              <div className="mb-3.5">
                {!collapsed && <div className="nav-label px-2.5 pb-1.5">Мастерская книги</div>}
                {WORKSHOP_ITEMS.map((item) => {
                  const href = `${basePath}/${item.path}${bookParam ? `?book=${bookParam}` : ""}`;
                  const active = pathname?.startsWith(`${basePath}/${item.path}`);
                  return (
                    <Link
                      key={item.path}
                      href={href}
                      title={collapsed ? item.label : undefined}
                      className={`nav-item flex items-center gap-2.5 px-2.5 py-[9px] text-[13.5px] mb-0.5${active ? " active" : ""}${collapsed ? " justify-center" : ""}`}
                    >
                      <span className="font-mono-label text-[12px] flex-shrink-0" style={{ width: 18, opacity: 0.85 }}>
                        {item.n}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}

            {storyWorkshopUnlocked && (
              <div className="mb-3.5">
                {!collapsed && <div className="nav-label px-2.5 pb-1.5">Мастерская рассказов</div>}
                {STORY_WORKSHOP_ITEMS.map((item) => {
                  const href = `${basePath}/${item.path}${cycleParam ? `?cycle=${cycleParam}` : ""}`;
                  const active = pathname?.startsWith(`${basePath}/${item.path}`);
                  return (
                    <Link
                      key={item.path}
                      href={href}
                      title={collapsed ? item.label : undefined}
                      className={`nav-item flex items-center gap-2.5 px-2.5 py-[9px] text-[13.5px] mb-0.5${active ? " active" : ""}${collapsed ? " justify-center" : ""}`}
                    >
                      <span className="font-mono-label text-[12px] flex-shrink-0" style={{ width: 18, opacity: 0.85 }}>
                        {item.n}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {calendar && !collapsed && (
          <CalendarWidget
            tasks={calendar.tasks}
            paymentDay={calendar.paymentDay}
            paymentStatus={calendar.paymentStatus}
          />
        )}
      </div>

      <div className="mt-4 pt-3.5" style={{ borderTop: "1px solid var(--rule)" }}>
        {collapsed ? (
          <div className="flex justify-center">
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: 32, height: 32, background: "var(--accent-soft)", color: "var(--wine)", fontSize: 12.5, fontWeight: 700 }}
            >
              {getInitials(userName)}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0"
              style={{ width: 32, height: 32, background: "var(--accent-soft)", color: "var(--wine)", fontSize: 12.5, fontWeight: 700 }}
            >
              {getInitials(userName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate" style={{ color: "var(--ink)" }}>
                {userName}
              </div>
              <div className="text-[11px]" style={{ color: "var(--faded)" }}>
                {mentorViewLabel ? "ученик" : isMentor ? "наставник" : "ученик"}
              </div>
            </div>
            {!mentorViewLabel && <LogoutButton />}
          </div>
        )}
      </div>
    </aside>
  );
}
