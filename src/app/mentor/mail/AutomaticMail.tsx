"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import ToggleSwitch from "@/components/ToggleSwitch";
import { saveBroadcast } from "@/features/mail/actions";
import {
  BROADCAST_META,
  scheduleLabel,
  timeZoneLabel,
  type BroadcastMode,
  type BroadcastSetting,
  type MailTimeZone,
} from "@/lib/mailBroadcasts";

type Student = { id: string; name: string };

export default function AutomaticMail({
  ready,
  initial,
  students,
  previews,
}: {
  ready: boolean;
  initial: BroadcastSetting[];
  students: Student[];
  previews: Record<string, { subject: string; html: string }>;
}) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function patch(key: string, partial: Partial<BroadcastSetting>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...partial } : row)));
  }

  async function save(row: BroadcastSetting) {
    setBusy(row.key);
    setMessage(null);
    const response = await saveBroadcast(row);
    setBusy(null);
    if ("error" in response && response.error) {
      setMessage(response.error);
      return;
    }
    setMessage("Сохранено.");
  }

  return (
    <section id="auto-mail" className="mb-6" data-auto-mail>
      <h2 className="text-[20px]">Автоматические рассылки</h2>
      {!ready ? (
        <p className="mt-2 text-[14px]">Таблица ещё не подключена. Нужен файл docs/sql/2026-10-20-mail-broadcast.sql.</p>
      ) : null}
      <ul className="mt-3 space-y-3">
        {rows.map((row) => {
          const meta = BROADCAST_META.find((item) => item.key === row.key);
          if (!meta) return null;
          const preview = previews[row.key];
          return (
            <li key={row.key} className="sheet px-4 py-4" data-auto-key={row.key} style={{ overflow: "hidden" }}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[16px] font-semibold">{meta.title}</h3>
                <ToggleSwitch checked={row.enabled} onChange={(enabled) => patch(row.key, { enabled })} label={row.enabled ? "вкл" : "выкл"} />
              </div>
              <p className="mt-2 text-[14px]" data-auto-schedule={row.key}>{scheduleLabel(row, meta.mode)}</p>
              <ScheduleFields row={row} mode={meta.mode} onChange={(partial) => patch(row.key, partial)} />
              <WhoFields row={row} who={meta.who} students={students} onChange={(partial) => patch(row.key, partial)} />
              {preview ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[14px]">Превью шаблона</summary>
                  <p className="mt-2 text-[14px]">Тема: {preview.subject}</p>
                  <iframe
                    title={`Превью: ${meta.title}`}
                    sandbox=""
                    srcDoc={preview.html}
                    className="mt-2 w-full rounded-[12px]"
                    style={{ height: 280, border: "1px solid var(--border)", background: "#F6F1E8" }}
                  />
                </details>
              ) : null}
              <Button className="mt-3" type="button" onClick={() => save(row)} disabled={busy === row.key || !ready}>
                {busy === row.key ? "Сохраняю..." : "Сохранить"}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
        Дедлайны сами не уходят.
      </p>
      {message ? <p className="mt-2 text-[14px]">{message}</p> : null}
    </section>
  );
}

function ScheduleFields({
  row,
  mode,
  onChange,
}: {
  row: BroadcastSetting;
  mode: BroadcastMode;
  onChange: (partial: Partial<BroadcastSetting>) => void;
}) {
  if (mode === "event") return null;
  if (mode === "batch") {
    return (
      <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
        Копить, минут
        <input
          aria-label="Окно пачки, минут"
          className="fld mt-1"
          inputMode="numeric"
          value={String(row.windowMinutes)}
          onChange={(event) => onChange({ windowMinutes: Number(event.target.value.replace(/[^\d]/g, "")) || 0 })}
        />
      </label>
    );
  }
  if (mode === "online") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ToggleSwitch checked={row.oncePerDay} onChange={(oncePerDay) => onChange({ oncePerDay })} label="не чаще раза в сутки" />
        <ZoneSelect zone={row.timeZone} onChange={(timeZone) => onChange({ timeZone })} />
      </div>
    );
  }
  const time = `${String(row.hour ?? 0).padStart(2, "0")}:${String(row.minute).padStart(2, "0")}`;
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="text-[13px]" style={{ color: "var(--muted)" }}>
        Дни
        <select
          aria-label="Дни рассылки"
          className="fld mt-1"
          value={row.weekdays === "1,2,3,4,5" ? "week" : row.weekdays === "6" || row.weekdays === "7" ? row.weekdays : ""}
          onChange={(event) => {
            const value = event.target.value;
            const weekdays = value === "week" ? "1,2,3,4,5" : value === "6" || value === "7" ? value : "";
            onChange({ weekdays });
          }}
        >
          <option value="">каждый день</option>
          <option value="week">по будням</option>
          <option value="6">суббота</option>
          <option value="7">воскресенье</option>
        </select>
      </label>
      <label className="text-[13px]" style={{ color: "var(--muted)" }}>
        Время
        <input
          aria-label="Время рассылки"
          className="fld mt-1"
          type="time"
          value={time}
          onChange={(event) => {
            const [hour, minute] = event.target.value.split(":");
            onChange({ hour: Number(hour), minute: Number(minute) });
          }}
        />
      </label>
      <label className="text-[13px]" style={{ color: "var(--muted)" }}>
        Окно, минут
        <input
          aria-label="Окно рассылки, минут"
          className="fld mt-1"
          inputMode="numeric"
          value={String(row.windowMinutes)}
          onChange={(event) => onChange({ windowMinutes: Number(event.target.value.replace(/[^\d]/g, "")) || 0 })}
        />
      </label>
      <ZoneSelect zone={row.timeZone} onChange={(timeZone) => onChange({ timeZone })} />
    </div>
  );
}

function ZoneSelect({ zone, onChange }: { zone: MailTimeZone; onChange: (zone: MailTimeZone) => void }) {
  return (
    <label className="text-[13px]" style={{ color: "var(--muted)" }}>
      Пояс
      <select
        aria-label="Часовой пояс"
        className="fld mt-1"
        value={zone}
        onChange={(event) => onChange(event.target.value === "Asia/Seoul" ? "Asia/Seoul" : "Europe/Moscow")}
      >
        <option value="Europe/Moscow">{timeZoneLabel("Europe/Moscow")}</option>
        <option value="Asia/Seoul">{timeZoneLabel("Asia/Seoul")}</option>
      </select>
    </label>
  );
}

function WhoFields({
  row,
  who,
  students,
  onChange,
}: {
  row: BroadcastSetting;
  who: "students" | "mentor" | "person";
  students: Student[];
  onChange: (partial: Partial<BroadcastSetting>) => void;
}) {
  if (who === "mentor") return <p className="mt-3 text-[14px]">Кому: наставнику</p>;
  if (who === "person") return <p className="mt-3 text-[14px]">Кому: тому, кого касается событие</p>;
  const picked = new Set(row.studentIds.split(",").filter(Boolean));
  return (
    <div className="mt-3">
      <label className="block text-[13px]" style={{ color: "var(--muted)" }}>
        Кому
        <select
          aria-label="Получатели"
          className="fld mt-1"
          value={row.audience}
          onChange={(event) => onChange({ audience: event.target.value === "chosen" ? "chosen" : "all" })}
        >
          <option value="all">все подходящие ученики</option>
          <option value="chosen">выбранные ученики</option>
        </select>
      </label>
      {row.audience === "chosen" ? (
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {students.map((student) => (
            <li key={student.id}>
              <label className="flex items-center gap-2 text-[14px]">
                <input
                  type="checkbox"
                  checked={picked.has(student.id)}
                  onChange={() => {
                    const next = new Set(picked);
                    if (next.has(student.id)) next.delete(student.id);
                    else next.add(student.id);
                    onChange({ studentIds: [...next].join(",") });
                  }}
                />
                {student.name}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
