"use client";

import { useTransition, useState } from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cycleStudentAccess, deleteStudent, moveStudent } from "./actions";
import PaymentControls from "./PaymentControls";
import WorkshopLockControls from "./WorkshopLockControls";
import { LinkButton } from "@/components/ui/Button";
import { OnlineBeacon, ActivityBeacon } from "./StudentBeacons";

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
  AWAITING: { bg: "#FFF3CD", color: "#856404" },
  SUSPENDED: { bg: "var(--accent-soft)", color: "var(--accent)" },
};

type Student = {
  id: string;
  name: string;
  email: string;
  status: string;
  paymentStatus: string;
  paymentDay: number | null;
  bookWorkshopUnlocked: boolean;
  storyWorkshopUnlocked: boolean;
  avatarUrl: string | null;
  lastSeenAt: Date | null;
  lastActivityAt: Date | null;
};

export default function StudentsList({ initialStudents }: { initialStudents: Student[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [, startTransition] = useTransition();

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

  function handleDelete(id: string) {
    if (!window.confirm("Удалить ученика и все его данные? Это необратимо.")) return;
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
    return <p className="text-[13.5px] mb-8" style={{ color: "var(--faded)" }}>Пока нет учеников.</p>;
  }

  return (
    <table className="w-full mb-10" style={{ borderCollapse: "collapse" }}>
      <tbody>
        {students.map((s, idx) => {
          const access = getAccessStatus(s.status, s.paymentStatus);
          const { bg, color } = ACCESS_COLORS[access];
          return (
            <tr key={s.id} style={{ borderBottom: "1px solid var(--rule)" }}>
              {/* reorder */}
              <td className="py-2.5 pr-1 align-top" style={{ width: 24 }}>
                <div className="flex flex-col gap-0.5" style={{ color: "var(--ink-faint)" }}>
                  <button
                    onClick={() => handleMove(s.id, "up")}
                    disabled={idx === 0}
                    className="disabled:opacity-20 hover:opacity-70"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={() => handleMove(s.id, "down")}
                    disabled={idx === students.length - 1}
                    className="disabled:opacity-20 hover:opacity-70"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
              </td>

              {/* avatar + name */}
              <td className="py-2.5 pr-3 text-[13.5px] align-top">
                <span className="flex items-center gap-2">
                  {s.avatarUrl ? (
                    <img
                      src={s.avatarUrl}
                      alt={s.name}
                      className="rounded-full flex-shrink-0"
                      style={{ width: 26, height: 26, objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
                      style={{ width: 26, height: 26, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 10 }}
                    >
                      {s.name.trim().split(/\s+/).map((p) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("")}
                    </span>
                  )}
                  <span>{s.name}</span>
                  <OnlineBeacon lastSeenAt={s.lastSeenAt} />
                  <ActivityBeacon lastActivityAt={s.lastActivityAt} />
                </span>
              </td>

              {/* email */}
              <td className="py-2.5 pr-3 text-[13.5px] align-top" style={{ color: "var(--ink-soft)" }}>
                {s.email}
              </td>

              {/* access status */}
              <td className="py-2.5 pr-3 align-top">
                <button
                  onClick={() => handleCycleAccess(s.id)}
                  className="text-[11.5px] font-medium px-2.5 py-1 rounded-full"
                  style={{ background: bg, color }}
                  title="Нажми для смены статуса"
                >
                  {ACCESS_LABELS[access]}
                </button>
              </td>

              {/* payment day */}
              <td className="py-2.5 pr-2 align-top">
                <PaymentControls userId={s.id} paymentDay={s.paymentDay} paymentStatus={s.paymentStatus as "PAID" | "PENDING"} />
              </td>

              {/* workshop locks */}
              <td className="py-2.5 pr-2 align-top">
                <WorkshopLockControls
                  userId={s.id}
                  bookUnlocked={s.bookWorkshopUnlocked}
                  storyUnlocked={s.storyWorkshopUnlocked}
                />
              </td>

              {/* open cabinet */}
              <td className="py-2.5 pr-2 align-top">
                <LinkButton href={`/student-view/${s.id}/tasks`} variant="neutral" pill>
                  Открыть кабинет
                </LinkButton>
              </td>

              {/* delete */}
              <td className="py-2.5 align-top">
                <button
                  onClick={() => handleDelete(s.id)}
                  title="Удалить ученика"
                  className="flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity"
                  style={{ color: "var(--accent)" }}
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
