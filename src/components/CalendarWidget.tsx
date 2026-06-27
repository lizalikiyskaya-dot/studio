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
    <div className="mt-3.5 rounded-[14px] px-2.5 pt-2.5 pb-2" style={{ background: "#fff" }}>
      <div className="mb-2.5">
        <span
          className="font-mono-label inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full"
          style={{
            background: paymentStatus === "PAID" ? "var(--sage-soft)" : "var(--accent-soft)",
            color: paymentStatus === "PAID" ? "var(--sage)" : "var(--wine)",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: paymentStatus === "PAID" ? "var(--sage)" : "var(--wine)",
            }}
          />
          {paymentStatus === "PAID" ? "доступ открыт" : "ожидает платежа"}
        </span>
      </div>

      <div className="flex items-center justify-between mb-2">
        <button onClick={() => changeMonth(-1)} className="text-[11px] px-1" style={{ color: "var(--faded)" }}>
          ‹
        </button>
        <span className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
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
            const isClickable = hasDeadline || isPaymentDay;
            const today = new Date();
            const isToday =
              day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <button
                key={di}
                onClick={() => isClickable && setSelectedDay(selectedDay === day ? null : day)}
                className="relative flex-1 flex flex-col items-center text-[11px] py-1 rounded-sm"
                style={{
                  cursor: isClickable ? "pointer" : "default",
                  background: selectedDay === day ? "var(--rule)" : "transparent",
                }}
              >
                <span className="flex gap-0.5 mb-0.5" style={{ height: 4 }}>
                  {hasDeadline && (
                    <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--ink)" }} />
                  )}
                  {isPaymentDay && (
                    <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--wine)" }} />
                  )}
                </span>
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: isToday ? "var(--ink)" : "transparent",
                    color: isToday ? "#fff" : undefined,
                    fontWeight: isToday ? 600 : undefined,
                  }}
                >
                  {day}
                </span>
              </button>
            );
          })}
        </div>
      ))}

      {selectedDay !== null && tasksByDay.has(selectedDay) && (
        <div className="mt-2 p-2.5 rounded-sm" style={{ border: "1px solid var(--rule)", background: "#fff" }}>
          <div className="text-[12px] mb-1.5" style={{ color: "var(--faded)" }}>
            Дедлайн {selectedDay} {MONTH_NAMES[month].toLowerCase()}
          </div>
          {tasksByDay.get(selectedDay)!.map((t) => (
            <div key={t.id} className="text-[12.5px] mb-1">
              {t.title || "Без названия"}
            </div>
          ))}
        </div>
      )}

      {selectedDay !== null && selectedDay === paymentDay && (
        <div className="mt-2 p-2.5 rounded-sm" style={{ border: "1px solid var(--rule)", background: "#fff" }}>
          <div className="text-[12px] mb-1.5" style={{ color: "var(--faded)" }}>
            Дата оплаты
          </div>
          <div className="text-[12.5px]">
            {selectedDay} число каждого месяца ·{" "}
            <span style={{ color: paymentStatus === "PAID" ? "var(--sage)" : "var(--wine)" }}>
              {paymentStatus === "PAID" ? "оплачено" : "ожидает оплаты"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
