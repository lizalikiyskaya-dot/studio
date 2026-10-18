"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import CalendarWidget from "@/components/CalendarWidget";

type TaskDeadline = { id: string; title: string; deadline: string };

export default function CalendarScreen({
  tasks,
  paymentDay,
  paymentStatus,
}: {
  tasks: TaskDeadline[];
  paymentDay: number | null;
  paymentStatus: "PAID" | "PENDING";
}) {
  const [mode, setMode] = useState<"month" | "list">("month");
  const sorted = [...tasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  return (
    <div>
      <PageHeader
        title="Календарь"
        description="Дедлайны заданий, день оплаты и разборы в одном месте."
        actions={
          <div className="seg">
            <button type="button" className="text-[14px] px-4 py-1.5 rounded-full" style={{ background: mode === "month" ? "#fff" : "transparent", fontWeight: mode === "month" ? 600 : 400 }} onClick={() => setMode("month")}>Месяц</button>
            <button type="button" className="text-[14px] px-4 py-1.5 rounded-full" style={{ background: mode === "list" ? "#fff" : "transparent", fontWeight: mode === "list" ? 600 : 400 }} onClick={() => setMode("list")}>Список</button>
          </div>
        }
      />
      {mode === "month" ? (
        <div className="max-w-[360px]">
          <CalendarWidget tasks={tasks} paymentDay={paymentDay} paymentStatus={paymentStatus} />
        </div>
      ) : (
        <div className="sheet px-3 pt-2 pb-1">
          <table>
            <thead>
              <tr><th>Дата</th><th>Задание</th></tr>
            </thead>
            <tbody>
              {sorted.length === 0 && <tr><td colSpan={2} style={{ color: "var(--muted)" }}>Дедлайнов пока нет.</td></tr>}
              {sorted.map((task) => (
                <tr key={task.id}>
                  <td className="whitespace-nowrap">{new Date(task.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</td>
                  <td>{task.title || "Задание"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
