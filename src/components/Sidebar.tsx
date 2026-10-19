"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  CalendarDays,
  FileText,
  LayoutGrid,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  PanelLeft,
  Pencil,
  PenLine,
  Send,
  X,
} from "lucide-react";
import CalendarWidget from "./CalendarWidget";
import Wordmark from "./Wordmark";
import ToggleSwitch from "./ToggleSwitch";
import WorkshopBookCard from "./WorkshopBookCard";
import type { WorkshopBook } from "@/lib/workshopBooks";
import { setReviewMode } from "@/features/reviewMode/actions";
import { useCanSuggest, useSetCanSuggest } from "@/features/suggestions/SuggestionContext";
import { useSheetSwipe } from "@/components/useSheetSwipe";

const TOP_ITEMS = [
  { path: "tasks", label: "Задания", icon: Bookmark },
  { path: "work-plan", label: "План работы", icon: CalendarDays },
  { path: "materials", label: "Материалы", icon: BookOpen },
  { path: "drafts", label: "Рукописи", icon: FileText },
  { path: "exercises", label: "Упражнения", icon: Pencil },
  { path: "submissions", label: "Трекер заявок", icon: Send },
  { path: "open-calls", label: "Опен-коллы", icon: Megaphone },
];

const WORKSHOP_ITEMS = [
  { path: "about", n: "01", label: "О книге" },
  { path: "plan", n: "02", label: "Трекер по главам" },
  { path: "acts", n: "03", label: "План книги" },
  { path: "dossier", n: "04", label: "Досье персонажей" },
  { path: "arcs", n: "05", label: "Арки персонажей" },
  { path: "setting", n: "06", label: "Сеттинг" },
];

const STORY_WORKSHOP_ITEMS = [
  { path: "cycles", n: "01", label: "Циклы рассказов" },
  { path: "stories", n: "02", label: "Отдельные рассказы" },
];

const BOOK_PATHS = new Set(WORKSHOP_ITEMS.map((item) => item.path));
const STORY_PATHS = new Set(STORY_WORKSHOP_ITEMS.map((item) => item.path));
const COLLAPSE_KEY = "sidebar-collapsed";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function sectionOf(pathname: string | null, basePath: string) {
  if (!pathname?.startsWith(basePath)) return "";
  const rest = pathname.slice(basePath.length).replace(/^\//, "");
  return rest.split("/")[0] ?? "";
}

function formatDeadline(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  const formatted = date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  if (diff === 0) return `сегодня, ${formatted}`;
  if (diff === 1) return `завтра, ${formatted}`;
  if (diff > 1 && diff < 7) return formatted;
  return formatted;
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
  avatarUrl,
  beacons,
  notesCount,
  books,
  children,
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
  avatarUrl?: string | null;
  beacons?: string[];
  notesCount?: number;
  books?: WorkshopBook[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bookParam = searchParams.get("book");
  const cycleParam = searchParams.get("cycle");
  const beaconSet = new Set(beacons ?? []);
  const reviewMode = useCanSuggest();
  const setReviewModeState = useSetCanSuggest();
  const [, startTransition] = useTransition();
  const [desktopCollapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState<null | "calendar" | "sections">(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  useSheetSwipe(sheet != null, () => setSheet(null), sheetRef, sheetBodyRef);
  const section = sectionOf(pathname, basePath);
  const onBook = BOOK_PATHS.has(section);
  const onStory = STORY_PATHS.has(section);

  useEffect(() => {
    // Collapse is remembered per browser. First paint stays expanded so
    // the server HTML matches the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  useEffect(() => {
    // Close the phone sheets after a navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSheet(null);
  }, [pathname]);

  useEffect(() => {
    if (!sheet) return;
    const html = document.documentElement;
    const body = document.body;
    const savedY = window.scrollY;
    const gap = 10;

    const metrics = () => {
      const chrome = document.querySelector(".studio-chrome")?.getBoundingClientRect().bottom ?? 0;
      const bar = document.querySelector(".studio-tabbar");
      const barShown = !!bar && getComputedStyle(bar).display !== "none";
      const barTop = barShown ? bar!.getBoundingClientRect().top : window.innerHeight;
      const banners = [...document.querySelectorAll<HTMLElement>(".banner-call, .banner-deadlines")]
        .map((el) => el.getBoundingClientRect())
        .filter((rect) => {
          if (rect.width < 2 || rect.height < 2) return false;
          const visible = Math.min(rect.bottom, barTop) - Math.max(rect.top, chrome);
          return visible > 48;
        })
        .sort((a, b) => a.top - b.top);
      return { chrome, barTop, first: banners[0] };
    };

    // Banners sit at the bottom of a short page, so a real bottom sheet always
    // lands on them once they are scrolled into view. Ease the scroll back until
    // they sit behind the tab bar, then open the sheet over the page itself.
    let guard = 0;
    while (guard < 4) {
      guard += 1;
      const { barTop, first } = metrics();
      if (!first || window.scrollY <= 0) break;
      const shift = barTop - first.top;
      if (shift <= 0) break;
      const next = Math.max(0, window.scrollY - shift);
      if (next === window.scrollY) break;
      window.scrollTo(0, next);
    }
    const viewY = window.scrollY;

    html.classList.add("studio-sheet-open");
    body.style.position = "fixed";
    body.style.top = `-${viewY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);

    const frame = window.requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>(".studio-sheet-root");
      const panel = document.querySelector<HTMLElement>(".studio-sheet");
      const outside = document.querySelector<HTMLElement>(".studio-sheet-outside");
      if (!root || !panel) return;
      const { chrome, barTop, first } = metrics();
      const tabOffset = Math.max(0, window.innerHeight - barTop);
      root.style.top = `${chrome}px`;
      panel.style.flex = "";
      if (!first) {
        root.classList.remove("avoids-banner");
        root.style.bottom = `${tabOffset}px`;
        root.style.height = "";
        panel.style.height = "";
        panel.style.maxHeight = "";
        if (outside) outside.hidden = true;
        return;
      }
      const space = Math.max(160, Math.floor(first.top - chrome - gap));
      const scrim = space > 300 ? 44 : 0;
      const sheetH = Math.min(480, space - scrim);
      root.classList.add("avoids-banner");
      root.style.bottom = "auto";
      root.style.height = `${space}px`;
      panel.style.height = `${sheetH}px`;
      panel.style.maxHeight = `${sheetH}px`;
      panel.style.flex = "0 0 auto";
      if (outside) {
        outside.hidden = false;
        outside.style.top = `${Math.round(chrome + space)}px`;
        outside.style.bottom = `${tabOffset}px`;
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      html.classList.remove("studio-sheet-open");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, savedY);
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  function toggleSheet(name: "calendar" | "sections") {
    setSheet((open) => (open === name ? null : name));
  }

  useEffect(() => {
    const chrome = document.querySelector<HTMLElement>(".studio-chrome");
    const sidebar = document.querySelector<HTMLElement>(".studio-sidebar");
    const apply = () => {
      if (chrome) {
        document.documentElement.style.setProperty("--chrome-h", `${Math.ceil(chrome.getBoundingClientRect().height)}px`);
      }
      if (sidebar && sidebar.getClientRects().length > 0) {
        document.documentElement.style.setProperty("--sidebar-h", `${Math.ceil(sidebar.scrollHeight)}px`);
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    if (chrome) observer.observe(chrome);
    if (sidebar) observer.observe(sidebar);
    return () => observer.disconnect();
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function handleToggleReviewMode(checked: boolean) {
    setReviewModeState(checked);
    if (studentId) startTransition(() => setReviewMode(studentId, checked));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function hrefFor(path: string) {
    if (BOOK_PATHS.has(path) && bookParam) return `${basePath}/${path}?book=${bookParam}`;
    if (STORY_PATHS.has(path) && cycleParam) return `${basePath}/${path}?cycle=${cycleParam}`;
    return `${basePath}/${path}`;
  }

  const bookBeacon = WORKSHOP_ITEMS.some((item) => beaconSet.has(item.path));
  const storyBeacon = STORY_WORKSHOP_ITEMS.some((item) => beaconSet.has(item.path));

  type TopLink = { key: string; href: string; label: string; icon: typeof Bookmark; beacon: boolean; active: boolean };
  const topLinks: TopLink[] = mentorMenuOnly
    ? [
        { key: "students", href: "/mentor", label: "Ученики и заявки", icon: Bookmark, beacon: false, active: pathname === "/mentor" },
        { key: "guides", href: "/mentor/guides", label: "Методички", icon: BookOpen, beacon: false, active: pathname === "/mentor/guides" || (pathname?.startsWith("/mentor/guides/") ?? false) },
        { key: "profile", href: "/mentor/profile", label: "Мой профиль", icon: Pencil, beacon: false, active: pathname === "/mentor/profile" },
      ]
    : [
        ...TOP_ITEMS.map((item) => ({
          key: item.path,
          href: hrefFor(item.path),
          label: item.label,
          icon: item.icon,
          beacon: beaconSet.has(item.path),
          active: section === item.path,
        })),
        ...(bookWorkshopUnlocked
          ? [{ key: "book", href: hrefFor("about"), label: "Мастерская книги", icon: BookOpen, beacon: bookBeacon, active: onBook }]
          : []),
        ...(storyWorkshopUnlocked
          ? [{ key: "stories", href: hrefFor("cycles"), label: "Мастерская рассказов", icon: PenLine, beacon: storyBeacon, active: onStory }]
          : []),
      ];

  const collapsedLinks: TopLink[] = mentorMenuOnly
    ? topLinks
    : [
        ...TOP_ITEMS.map((item) => ({
          key: item.path,
          href: hrefFor(item.path),
          label: item.label,
          icon: item.icon,
          beacon: beaconSet.has(item.path),
          active: section === item.path,
        })),
        ...(bookWorkshopUnlocked
          ? WORKSHOP_ITEMS.map((item) => ({
              key: item.path,
              href: hrefFor(item.path),
              label: item.label,
              icon: BookOpen,
              beacon: beaconSet.has(item.path),
              active: section === item.path,
            }))
          : []),
        ...(storyWorkshopUnlocked
          ? STORY_WORKSHOP_ITEMS.map((item) => ({
              key: item.path,
              href: hrefFor(item.path),
              label: item.label,
              icon: PenLine,
              beacon: beaconSet.has(item.path),
              active: section === item.path,
            }))
          : []),
      ];

  const headerLinks = desktopCollapsed && !mentorMenuOnly ? collapsedLinks : topLinks;
  const avatarBg = "var(--deep)";
  const avatarFg = "var(--y)";
  const profileHref = mentorMenuOnly ? "/mentor/profile" : `${basePath}/profile`;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcoming = (calendar?.tasks ?? [])
    .map((task) => ({ ...task, time: new Date(task.deadline).getTime() }))
    .filter((task) => task.time >= todayStart.getTime())
    .sort((a, b) => a.time - b.time)[0];

  const subItems = onBook && bookWorkshopUnlocked
    ? WORKSHOP_ITEMS
    : onStory && storyWorkshopUnlocked
      ? STORY_WORKSHOP_ITEMS
      : null;

  const mentorBar = mentorViewLabel ? (
    <div className="mentor-bar">
      <Link href="/mentor"><ArrowLeft size={16} /> к списку</Link>
      <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
      <span>Кабинет: <b className="font-semibold">{mentorViewLabel}</b></span>
      {studentId && isMentor && (
        <span className="mentor-review">
          <span style={{ color: "rgba(255,255,255,0.7)" }}>Режим правок</span>
          <ToggleSwitch checked={reviewMode} onChange={handleToggleReviewMode} />
        </span>
      )}
    </div>
  ) : null;

  return (
    <div className={`studio-shell${mentorViewLabel ? " has-mentor" : ""}${!mentorMenuOnly ? " has-tabs" : ""}`}>
      <div className="studio-chrome">
        {mentorBar}
      <header className="studio-topbar">
        <Link href={mentorMenuOnly ? "/mentor" : `${basePath}/tasks`} className="studio-logo">
          <Wordmark />
          {mentorMenuOnly && <span className="studio-logo-note">кабинет наставника</span>}
        </Link>
        <nav className={`studio-topnav${desktopCollapsed && !mentorMenuOnly ? " is-collapsed" : ""}`} aria-label="Разделы">
          {headerLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.key} href={item.href} className={item.active ? "active" : ""} title={item.label}>
                <Icon className="nav-icon" size={16} />
                <span className="nav-text">{item.label}</span>
                {item.beacon && <span className="nav-beacon" title="Есть обновления" />}
              </Link>
            );
          })}
        </nav>
        <div className="studio-top-actions">
          {desktopCollapsed && !mentorMenuOnly && (
            <button type="button" className="collapse-desktop place-items-center h-10 w-10 rounded-full" style={{ background: "var(--soft)" }} onClick={toggleCollapsed} title="Развернуть меню">
              <PanelLeft size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
          )}
          {typeof notesCount === "number" && (
            <button type="button" className="notes-chip" onClick={() => window.dispatchEvent(new Event("studio:toggle-notes"))}>
              <MessageSquareText size={16} />
              Заметки
              {notesCount > 0 && <span className="notes-count">{notesCount}</span>}
            </button>
          )}
          {!mentorViewLabel && (
            <Link href={profileHref} className="avatar h-10 w-10 text-[13px]" style={{ background: isMentor ? "var(--deep)" : avatarBg, color: isMentor ? "#fff" : avatarFg }} title={userName}>
              {avatarUrl ? <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" /> : getInitials(userName)}
            </Link>
          )}
          <button
            type="button"
            className="studio-menu-btn items-center gap-2 rounded-full px-3 h-10"
            style={{ background: "var(--soft)" }}
            onClick={() => toggleSheet("sections")}
            aria-expanded={sheet === "sections"}
          >
            {sheet === "sections" ? <X size={18} /> : <Menu size={18} />}
            {sheet === "sections" ? "Закрыть" : "Меню"}
          </button>
        </div>
      </header>
      </div>

      <div className="studio-body">
        <aside id="studio-navigation" className={`studio-sidebar${desktopCollapsed && !mentorMenuOnly ? " is-collapsed" : ""}`}>
          <div className="flex justify-end studio-menu-btn">
            <button type="button" onClick={() => setSheet(null)} className="inline-flex items-center gap-2 rounded-full px-3 h-9" style={{ background: "#fff" }}>
              <X size={16} /> Закрыть
            </button>
          </div>

          {!mentorMenuOnly && (
            <div className="side-card flex items-center gap-3">
              <div className="avatar h-10 w-10 text-[13px]" style={{ background: avatarBg, color: avatarFg }}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(userName)}
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-[14.5px] font-semibold truncate">{userName}</div>
                <div className="text-[12.5px]" style={{ color: "var(--muted)" }}>личный кабинет</div>
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="collapse-desktop ml-auto place-items-center"
                style={{ color: "var(--muted)" }}
                title={desktopCollapsed ? "Развернуть меню" : "Свернуть меню"}
              >
                <PanelLeft size={16} />
              </button>
            </div>
          )}

          {calendar && (
            <div className="px-1 flex items-center gap-2 text-[12.5px]">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: calendar.paymentStatus === "PAID" ? "var(--pill-mint-bg)" : "var(--pill-or-bg)", color: calendar.paymentStatus === "PAID" ? "var(--pill-mint-fg)" : "var(--pill-or-fg)" }}>
                {calendar.paymentStatus === "PAID" ? "доступ открыт" : "ожидает платежа"}
              </span>
              {calendar.paymentDay != null && (
                <span style={{ color: "var(--muted)" }}>оплата {calendar.paymentDay}-го</span>
              )}
            </div>
          )}

          {onBook && bookWorkshopUnlocked && <WorkshopBookCard books={books ?? []} />}

          {subItems && (
            <nav className="side-card !p-2" aria-label="Разделы мастерской">
              {subItems.map((item) => {
                const active = section === item.path;
                return (
                  <Link
                    key={item.path}
                    href={hrefFor(item.path)}
                    className={`nav-item flex items-center gap-2.5 px-3 py-2 text-[14.5px]${active ? " active" : ""}`}
                  >
                    <span className="text-[12px] w-[18px]" style={{ color: "var(--muted)" }}>{item.n}</span>
                    <span>{item.label}</span>
                    {beaconSet.has(item.path) && <span className="ml-auto h-[7px] w-[7px] rounded-full" style={{ background: "var(--danger)" }} title="Есть обновления" />}
                  </Link>
                );
              })}
            </nav>
          )}

          {calendar && (
            <CalendarWidget
              tasks={calendar.tasks}
              paymentDay={calendar.paymentDay}
              paymentStatus={calendar.paymentStatus}
            />
          )}

          {upcoming && (
            <div className="deadline-card">
              <span className="deadline-ribbon" aria-hidden="true" />
              <div className="deadline-kicker">Ближайший дедлайн</div>
              <div className="serif deadline-title">{upcoming.title || "Задание"}</div>
              <div className="deadline-when">{formatDeadline(upcoming.deadline)}</div>
            </div>
          )}

          {mentorMenuOnly && (
            <nav className="mentor-side-nav side-card !p-2" aria-label="Разделы наставника">
              {topLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`nav-item flex items-center gap-2.5 px-3 py-2 text-[14.5px]${item.active ? " active" : ""}`}
                    style={{ color: "var(--ink)" }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {mentorMenuOnly && (
            <div className="side-card">
              <div className="text-[16px] font-semibold">Кабинет наставника</div>
              <Link href="/mentor/profile" className="lnk mt-3 inline-flex text-[13.5px]">Мой профиль</Link>
            </div>
          )}

          <div className="side-card mt-auto flex items-center gap-2">
            {!mentorViewLabel ? (
              <>
                <Link href={profileHref} className="text-[13.5px] font-medium">профиль</Link>
                <button type="button" onClick={logout} className="ml-auto inline-flex items-center gap-1.5 text-[13px]" style={{ color: "var(--muted)" }}>
                  <LogOut size={14} /> Выйти
                </button>
              </>
            ) : (
              <span className="text-[13px]" style={{ color: "var(--muted)" }}>Кабинет {mentorViewLabel}</span>
            )}
          </div>
        </aside>

        <main className="studio-content">{children}</main>
      </div>

      {!mentorMenuOnly && (
        <nav className="studio-tabbar" aria-label="Мобильные разделы">
          <Tab href={`${basePath}/tasks`} label="Задания" icon={ListChecks} active={section === "tasks"} />
          {bookWorkshopUnlocked ? (
            <Tab href={hrefFor("about")} label="Книга" icon={BookOpen} active={onBook} beacon={bookBeacon} />
          ) : (
            <Tab href={`${basePath}/materials`} label="Материалы" icon={BookOpen} active={section === "materials"} />
          )}
          <Tab href={`${basePath}/exercises`} label="Упражнения" icon={PenLine} active={section === "exercises"} beacon={beaconSet.has("exercises")} />
          <button
            type="button"
            onClick={() => toggleSheet("calendar")}
            aria-expanded={sheet === "calendar"}
            className="studio-tab flex-1 flex flex-col items-center gap-1 text-[11px]"
            style={{ color: sheet === "calendar" ? "var(--ink)" : "var(--muted)", fontWeight: sheet === "calendar" ? 600 : 400 }}
          >
            <span className="h-8 w-12 rounded-full grid place-items-center" style={{ background: sheet === "calendar" ? "var(--y)" : "transparent" }}><CalendarDays size={16} /></span>
            Календарь
          </button>
          <button
            type="button"
            onClick={() => toggleSheet("sections")}
            aria-expanded={sheet === "sections"}
            className="studio-tab flex-1 flex flex-col items-center gap-1 text-[11px]"
            style={{ color: sheet === "sections" ? "var(--ink)" : "var(--muted)", fontWeight: sheet === "sections" ? 600 : 400 }}
          >
            <span className="h-8 w-12 rounded-full grid place-items-center" style={{ background: sheet === "sections" ? "var(--y)" : "transparent" }}><LayoutGrid size={16} /></span>
            Разделы
          </button>
        </nav>
      )}

      {sheet && (
        <div className="studio-sheet-root">
          <button type="button" className="studio-sheet-backdrop" aria-label="Закрыть" onClick={() => setSheet(null)} />
          <button type="button" className="studio-sheet-outside" aria-label="Закрыть" hidden onClick={() => setSheet(null)} />
          <div
            ref={sheetRef}
            className="studio-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={sheet === "calendar" ? "Календарь" : "Разделы"}
          >
            <div className="studio-sheet-head">
              <button type="button" className="sheet-grab" data-sheet-handle aria-label="Потяните вниз, чтобы закрыть">
                <span />
              </button>
              <div className="text-[16px] font-semibold">{sheet === "calendar" ? "Календарь" : "Разделы"}</div>
              <button type="button" className="studio-sheet-close" onClick={() => setSheet(null)}>
                <X size={16} /> Закрыть
              </button>
            </div>
            <div ref={sheetBodyRef} className="studio-sheet-body">
              {sheet === "calendar" ? (
                <>
                  {calendar && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 px-1 text-[12.5px]">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ background: calendar.paymentStatus === "PAID" ? "var(--pill-mint-bg)" : "var(--pill-or-bg)", color: calendar.paymentStatus === "PAID" ? "var(--pill-mint-fg)" : "var(--pill-or-fg)" }}>
                        {calendar.paymentStatus === "PAID" ? "доступ открыт" : "ожидает платежа"}
                      </span>
                      {calendar.paymentDay != null && (
                        <span style={{ color: "var(--muted)" }}>оплата {calendar.paymentDay}-го</span>
                      )}
                    </div>
                  )}
                  {calendar && (
                    <CalendarWidget
                      tasks={calendar.tasks}
                      paymentDay={calendar.paymentDay}
                      paymentStatus={calendar.paymentStatus}
                    />
                  )}
                  {upcoming && (
                    <div className="deadline-card mt-3">
                      <span className="deadline-ribbon" aria-hidden="true" />
                      <div className="deadline-kicker">Ближайший дедлайн</div>
                      <div className="serif deadline-title">{upcoming.title || "Задание"}</div>
                      <div className="deadline-when">{formatDeadline(upcoming.deadline)}</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <nav aria-label="Разделы кабинета">
                    {topLinks.filter((item) => item.key !== "book" && item.key !== "stories").map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.key} href={item.href} className={`studio-sheet-link${item.active ? " active" : ""}`}>
                          <Icon size={16} />
                          <span>{item.label}</span>
                          {item.beacon && <span className="ml-auto h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} title="Есть обновления" />}
                        </Link>
                      );
                    })}
                    {bookWorkshopUnlocked && !mentorMenuOnly && (
                      <>
                        <div className="studio-sheet-kicker">Мастерская книги</div>
                        <div className="mb-3">
                          <WorkshopBookCard books={books ?? []} />
                        </div>
                        {WORKSHOP_ITEMS.map((item) => (
                          <Link key={item.path} href={hrefFor(item.path)} className={`studio-sheet-link${section === item.path ? " active" : ""}`}>
                            <span className="w-4 text-[12px]" style={{ color: "var(--muted)" }}>{item.n}</span>
                            <span>{item.label}</span>
                            {beaconSet.has(item.path) && <span className="ml-auto h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} title="Есть обновления" />}
                          </Link>
                        ))}
                      </>
                    )}
                    {storyWorkshopUnlocked && !mentorMenuOnly && (
                      <>
                        <div className="studio-sheet-kicker">Мастерская рассказов</div>
                        {STORY_WORKSHOP_ITEMS.map((item) => (
                          <Link key={item.path} href={hrefFor(item.path)} className={`studio-sheet-link${section === item.path ? " active" : ""}`}>
                            <span className="w-4 text-[12px]" style={{ color: "var(--muted)" }}>{item.n}</span>
                            <span>{item.label}</span>
                            {beaconSet.has(item.path) && <span className="ml-auto h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} title="Есть обновления" />}
                          </Link>
                        ))}
                      </>
                    )}
                  </nav>
                  {!mentorViewLabel && (
                    <div className="mt-3 flex items-center px-3 pb-1">
                      {!mentorMenuOnly && (
                        <Link href={profileHref} className="text-[14.5px] font-medium" style={{ color: "var(--ink)" }}>Профиль</Link>
                      )}
                      <button type="button" onClick={logout} className="ml-auto inline-flex items-center gap-1.5 text-[13.5px]" style={{ color: "var(--muted)" }}>
                        <LogOut size={14} /> Выйти
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tab({ href, label, icon: Icon, active, beacon }: { href: string; label: string; icon: typeof Bookmark; active: boolean; beacon?: boolean }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center gap-1 text-[11px] relative" style={{ color: active ? "var(--ink)" : "var(--muted)", fontWeight: active ? 600 : 400 }}>
      <span className="h-8 w-12 rounded-full grid place-items-center" style={{ background: active ? "var(--y)" : "transparent" }}>
        <Icon size={16} />
      </span>
      {label}
      {beacon && <span className="absolute top-0 right-3 h-2 w-2 rounded-full" style={{ background: "var(--danger)" }} />}
    </Link>
  );
}
