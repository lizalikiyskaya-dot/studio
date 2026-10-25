"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useTransition, useState } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cycleStudentAccess, deleteStudent, moveStudent } from "./actions";
import PaymentControls from "./PaymentControls";
import WorkshopLockControls from "./WorkshopLockControls";
import { LinkButton } from "@/components/ui/Button";
import EmptyState from "@/components/EmptyState";
import { PresenceIndicator, ActivityBeacon } from "./StudentBeacons";

type AccessStatus = "OPEN" | "AWAITING" | "SUSPENDED";

function getAccessStatus(status: string, paymentStatus: string): AccessStatus {
  if (status === "SUSPENDED") return "SUSPENDED";
  if (paymentStatus === "PAID") return "OPEN";
  return "AWAITING";
}

const ACCESS_LABELS: Record<AccessStatus, string> = {
  OPEN: "доступ открыт",
  AWAITING: "ожидает оплаты",
  SUSPENDED: "доступ закрыт",
};

const ACCESS_COLORS: Record<AccessStatus, { bg: string; color: string }> = {
  OPEN: { bg: "var(--sage-soft)", color: "var(--sage)" },
  AWAITING: { bg: "var(--pill-or-bg)", color: "var(--pill-or-fg)" },
  SUSPENDED: { bg: "var(--pill-red-bg)", color: "var(--pill-red-fg)" },
};

type Student = {
  id: string;
  name: string;
  email: string;
  status: string;
  paymentStatus: string;
  paymentDay: number | null;
  paymentAmount: number | null;
  paymentReminders: boolean;
  bookWorkshopUnlocked: boolean;
  storyWorkshopUnlocked: boolean;
  avatarUrl: string | null;
  lastSeenAt: Date | null;
  lastActivityAt: Date | null;
  /** Время самой свежей правки ученика, которую наставник ещё не открывал. */
  unseenAt: Date | null;
  /** Задание, глава или рукопись, которые сейчас в работе. Пусто — «—». */
  currentWork: string | null;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function Avatar({ name, url, large }: { name: string; url: string | null; large?: boolean }) {
  const size = large ? 36 : undefined;
  if (url) {
    return <img src={url} alt="" className="mentor-avatar" style={size ? { width: size, height: size } : undefined} />;
  }
  return (
    <span className="mentor-avatar mentor-avatar-fallback" style={size ? { width: size, height: size, fontSize: 12 } : undefined}>
      {initials(name)}
    </span>
  );
}

function Person({ student }: { student: Student }) {
  return (
    <div className="mentor-person">
      <div className="mentor-person-title">
        <Avatar name={student.name} url={student.avatarUrl} />
        <span className="mentor-person-name">{student.name}</span>
        <ActivityBeacon unseenAt={student.unseenAt} />
      </div>
      <span className="mentor-person-email" title={student.email}>{student.email}</span>
    </div>
  );
}

function AccessButton({ access, onClick }: { access: AccessStatus; onClick: () => void }) {
  const { bg, color } = ACCESS_COLORS[access];
  return (
    <button type="button" onClick={onClick} className="mentor-access" style={{ background: bg, color }} title="Нажми для смены статуса">
      {ACCESS_LABELS[access]}
    </button>
  );
}

function Reorder({ id, idx, total, onMove }: { id: string; idx: number; total: number; onMove: (id: string, dir: "up" | "down") => void }) {
  return (
    <div className="mentor-reorder">
      <button type="button" onClick={() => onMove(id, "up")} disabled={idx === 0} className="disabled:opacity-20 hover:opacity-70" title="Выше">
        <ChevronUp size={13} />
      </button>
      <button type="button" onClick={() => onMove(id, "down")} disabled={idx === total - 1} className="disabled:opacity-20 hover:opacity-70" title="Ниже">
        <ChevronDown size={13} />
      </button>
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Удалить ученика"
      className="flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity"
      style={{ color: "var(--muted)" }}
    >
      <Trash2 size={14} />
    </button>
  );
}

export default function StudentsList({ initialStudents }: { initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "unpaid">("all");
  const [, startTransition] = useTransition();
  const visible = students.filter((s) => {
    const q = query.trim().toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
    if (filter === "online") {
      return Boolean(s.lastSeenAt && Date.now() - new Date(s.lastSeenAt).getTime() < 3 * 60_000);
    }
    if (filter === "unpaid") return getAccessStatus(s.status, s.paymentStatus) !== "OPEN";
    return true;
  });

  function handleCycleAccess(id: string) {
    startTransition(async () => {
      const next = await cycleStudentAccess(id);
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          if (next === "OPEN") return { ...s, status: "APPROVED", paymentStatus: "PAID" };
          if (next === "AWAITING") return { ...s, status: "APPROVED", paymentStatus: "PENDING" };
          return { ...s, status: "SUSPENDED" };
        })
      );
    });
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить ученика и все его данные? Это необратимо."))) return;
    setStudents((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteStudent(id));
  }

  function handleMove(id: string, dir: "up" | "down") {
    setStudents((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    startTransition(() => moveStudent(id, dir));
  }

  if (students.length === 0) {
    return (
      <EmptyState
        cue="Самое время открыть студию"
        detail="Когда появится первый ученик, кабинет будет здесь."
      />
    );
  }

  return (
    <div className="mb-10">
      <div className="mentor-tools">
        <label className="flex items-center gap-2 h-11 w-full max-w-[280px] rounded-full px-4 text-[14px]" style={{ background: "var(--soft)", color: "var(--muted)" }}>
          <span className="sr-only">Найти ученика</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Найти ученика"
            className="w-full bg-transparent outline-none"
            style={{ color: "var(--ink)" }}
          />
        </label>
        <div className="mentor-seg" role="tablist" aria-label="Фильтр учеников">
          {(
            [
              ["all", "Все"],
              ["online", "Онлайн"],
              ["unpaid", "Без оплаты"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? "is-on" : undefined} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 && (
        <p className="text-[14px] mb-4" style={{ color: "var(--muted)" }}>Никого не нашли. Список учеников на месте — измените запрос.</p>
      )}

      <div className="mentor-students">
      <div className="sheet mentor-sheet">
        <div className="mentor-grid">
        <div className="mentor-row mentor-head" role="row">
          <div />
          <div>Ученик</div>
          <div className="mentor-h-now">Последнее</div>
          <div>Доступ</div>
          <div className="mentor-h-pay">День оплаты</div>
          <div>В сети</div>
          <div className="mentor-h-ws">Мастерские</div>
          <div className="mentor-h-cabinet">Кабинет</div>
          <div />
        </div>
        {visible.map((s) => {
          const idx = students.findIndex((row) => row.id === s.id);
          const access = getAccessStatus(s.status, s.paymentStatus);
          return (
            <div key={s.id} className="mentor-row mentor-data" role="row">
              <Reorder id={s.id} idx={idx} total={students.length} onMove={handleMove} />
              <Person student={s} />
              <div className={s.currentWork ? "mentor-now" : "mentor-now is-empty"}>
                {s.currentWork ?? "—"}
              </div>
              <AccessButton access={access} onClick={() => handleCycleAccess(s.id)} />
              <PaymentControls
                userId={s.id}
                paymentDay={s.paymentDay}
                paymentAmount={s.paymentAmount}
                paymentReminders={s.paymentReminders}
              />
              <PresenceIndicator lastSeenAt={s.lastSeenAt} />
              <WorkshopLockControls
                userId={s.id}
                bookUnlocked={s.bookWorkshopUnlocked}
                storyUnlocked={s.storyWorkshopUnlocked}
              />
              <LinkButton href={`/student-view/${s.id}/tasks`} variant="neutral" size="sm" pill title="Открыть кабинет" className="mentor-open !h-8 !px-3 !text-[12.5px]">
                Открыть кабинет
              </LinkButton>
              <DeleteButton onClick={() => handleDelete(s.id)} />
            </div>
          );
        })}
        </div>
      </div>

      <div className="mentor-cards">
        {visible.map((s) => {
          const idx = students.findIndex((row) => row.id === s.id);
          const access = getAccessStatus(s.status, s.paymentStatus);
          return (
            <article key={s.id} className="mentor-card">
              <div className="flex items-start gap-2.5">
                <Reorder id={s.id} idx={idx} total={students.length} onMove={handleMove} />
                <Avatar name={s.name} url={s.avatarUrl} large />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[15px] font-medium leading-snug break-words">{s.name}</span>
                    <ActivityBeacon unseenAt={s.unseenAt} />
                  </div>
                  <div className="mt-0.5 truncate text-[12.5px]" style={{ color: "var(--muted)" }} title={s.email}>{s.email}</div>
                  <div className="mt-1.5">
                    <div className="mentor-card-kicker">Сейчас в работе</div>
                    <div className={s.currentWork ? "mentor-now" : "mentor-now is-empty"}>{s.currentWork ?? "—"}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-nowrap items-center gap-1.5">
                <AccessButton access={access} onClick={() => handleCycleAccess(s.id)} />
                <WorkshopLockControls
                  userId={s.id}
                  bookUnlocked={s.bookWorkshopUnlocked}
                  storyUnlocked={s.storyWorkshopUnlocked}
                />
              </div>
              <div className="mentor-card-meta">
                <div className="mentor-card-pay">
                  <span className="mentor-card-kicker">День оплаты</span>
                  <PaymentControls
                    userId={s.id}
                    paymentDay={s.paymentDay}
                    paymentAmount={s.paymentAmount}
                    paymentReminders={s.paymentReminders}
                  />
                </div>
                <PresenceIndicator lastSeenAt={s.lastSeenAt} />
              </div>
              <div className="mentor-card-actions">
                <LinkButton href={`/student-view/${s.id}/tasks`} variant="neutral" size="sm" pill title="Открыть кабинет" className="mentor-open">
                  Открыть кабинет
                </LinkButton>
                <DeleteButton onClick={() => handleDelete(s.id)} />
              </div>
            </article>
          );
        })}
      </div>
      </div>
    </div>
  );
}
