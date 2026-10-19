"use client";

import { useState } from "react";

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type TaskDeadline = { id: string; title: string; deadline: string };

export default function CalendarWidget({
  tasks,
  paymentDay,
  paymentStatus,
}: {
  tasks: TaskDeadline[];
  paymentDay: number | null;
  paymentStatus: "PAID" | "PENDING";
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const tasksByDay = new Map<number, TaskDeadline[]>();
  for (const task of tasks) {
    const d = new Date(task.deadline);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      const list = tasksByDay.get(day) ?? [];
      list.push(task);
      tasksByDay.set(day, list);
    }
  }

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function changeMonth(delta: number) {
    setSelectedDay(null);
    setCursor(new Date(year, month + delta, 1));
  }

  return (
    <div className="side-card">
      <div className="flex items-center">
        <span className="text-[15px] font-semibold">{MONTH_NAMES[month]} {year}</span>
        <span className="ml-auto flex gap-1" style={{ color: "var(--muted)" }}>
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Предыдущий месяц">‹</button>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Следующий месяц">›</button>
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[11px]" style={{ color: "var(--muted)" }}>{w}</span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={index} />;
          const hasDeadline = tasksByDay.has(day);
          const isPaymentDay = paymentDay === day;
          const today = new Date();
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const selected = selectedDay === day;
          let background = "transparent";
          let color = "var(--ink)";
          if (isToday) { background = "var(--ink)"; color = "#fff"; }
          else if (hasDeadline) { background = "var(--pill-or-bg)"; color = "var(--pill-or-fg)"; }
          else if (isPaymentDay) { background = "var(--pill-mint-bg)"; color = "var(--pill-mint-fg)"; }
          return (
            <button
              key={index}
              type="button"
              onClick={() => (hasDeadline || isPaymentDay) && setSelectedDay(selected ? null : day)}
              className="h-7 grid place-items-center rounded-lg text-[12.5px]"
              style={{
                background,
                color,
                fontWeight: isToday || hasDeadline || isPaymentDay ? 600 : 400,
                boxShadow: selected ? "0 0 0 2px var(--v)" : undefined,
                cursor: hasDeadline || isPaymentDay ? "pointer" : "default",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]" style={{ color: "var(--ink2)" }}>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#F28A3C" }} />дедлайн</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#2FB083" }} />день оплаты</span>
      </div>

      {selectedDay !== null && tasksByDay.has(selectedDay) && (
        <div className="mt-3 text-[13px]">
          <div className="font-semibold">{selectedDay} {MONTH_NAMES[month].toLowerCase()}</div>
          {tasksByDay.get(selectedDay)!.map((t) => (
            <div key={t.id} className="mt-1 flex items-center gap-1.5" style={{ color: "var(--ink2)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "#F28A3C" }} />
              {t.title || "Без названия"}
            </div>
          ))}
        </div>
      )}

      {selectedDay !== null && selectedDay === paymentDay && (
        <div className="mt-2 text-[13px]" style={{ color: paymentStatus === "PAID" ? "var(--sage)" : "var(--pill-or-fg)" }}>
          {selectedDay} число · {paymentStatus === "PAID" ? "оплачено" : "ожидает оплаты"}
        </div>
      )}
    </div>
  );
}
