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

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

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
  const weeks = chunk(cells, 7);

  function changeMonth(delta: number) {
    setSelectedDay(null);
    setCursor(new Date(year, month + delta, 1));
  }

  return (
    <div className="mt-6 pt-4 border-t" style={{ borderColor: "var(--rule)" }}>
      <div className="mb-2.5">
        <span
          className="font-mono-label text-[10px] uppercase px-2 py-1 rounded-full"
          style={{
            background: paymentStatus === "PAID" ? "var(--sage)" : "var(--wine)",
            color: "#fff",
          }}
        >
          {paymentStatus === "PAID" ? "доступ открыт" : "ожидает платежа"}
        </span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => changeMonth(-1)} className="text-[11px] px-1" style={{ color: "var(--faded)" }}>
          ‹
        </button>
        <span className="font-mono-label text-[10px] uppercase" style={{ color: "var(--ink-soft)" }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={() => changeMonth(1)} className="text-[11px] px-1" style={{ color: "var(--faded)" }}>
          ›
        </button>
      </div>

      <div className="flex">
        {WEEKDAYS.map((w) => (
          <div key={w} className="flex-1 text-center font-mono-label text-[8px] uppercase" style={{ color: "var(--faded)" }}>
            {w}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="flex">
          {week.map((day, di) => {
            if (day === null) return <div key={di} className="flex-1" />;
            const hasDeadline = tasksByDay.has(day);
            const isPaymentDay = paymentDay === day;
            return (
              <button
                key={di}
                onClick={() => hasDeadline && setSelectedDay(selectedDay === day ? null : day)}
                className="flex-1 relative text-[11px] py-1 rounded-sm"
                style={{
                  cursor: hasDeadline ? "pointer" : "default",
                  background: selectedDay === day ? "var(--rule)" : "transparent",
                }}
              >
                {day}
                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 flex gap-0.5">
                  {hasDeadline && (
                    <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--ink)" }} />
                  )}
                  {isPaymentDay && (
                    <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--wine)" }} />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ))}

      {selectedDay !== null && tasksByDay.has(selectedDay) && (
        <div className="mt-2 p-2.5 rounded-sm" style={{ border: "1px solid var(--rule)", background: "#fff" }}>
          <div className="font-mono-label text-[9px] uppercase mb-1.5" style={{ color: "var(--faded)" }}>
            Дедлайн {selectedDay} {MONTH_NAMES[month].toLowerCase()}
          </div>
          {tasksByDay.get(selectedDay)!.map((t) => (
            <div key={t.id} className="text-[12.5px] mb-1">
              {t.title || "Без названия"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
