"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import ToggleSwitch from "@/components/ToggleSwitch";
import { deleteCustomMailing, previewCustomMailing, saveCustomMailing } from "@/features/mail/customActions";
import { customScheduleLabel, type CustomCadence, type CustomMailingInput, type CustomMailingRow } from "@/lib/customMailPlan";

type Student = { id: string; name: string };

const WEEKDAYS = ["", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];

function blank(): CustomMailingInput {
  return {
    name: "",
    subject: "",
    body: "",
    enabled: false,
    cadence: "once",
    runOn: "",
    weekday: 1,
    monthDay: 1,
    hour: 9,
    minute: 0,
    audience: "all",
    studentIds: "",
  };
}

export default function CustomMailings({
  ready,
  initial,
  students,
}: {
  ready: boolean;
  initial: CustomMailingRow[];
  students: Student[];
}) {
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="mt-8" data-custom-mail>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[18px] font-semibold">Свои рассылки</h3>
        <Button type="button" onClick={() => { setCreating(true); setMessage(null); }} disabled={!ready || creating}>
          Новая рассылка
        </Button>
      </div>
      <p className="mt-2 text-[14px]" style={{ color: "var(--muted)" }}>
        Здесь Вы задаёте свои письма. Новая рассылка выключена, пока Вы её не включите. Подпись добавится сама.
      </p>
      {!ready ? <p className="mt-2 text-[14px]">Таблица ещё не подключена. Нужен файл docs/sql/2026-11-01-custom-mailing.sql.</p> : null}
      {creating ? (
        <Editor
          students={students}
          initial={blank()}
          onCancel={() => setCreating(false)}
          onSaved={(row) => {
            setRows((current) => [row, ...current.filter((item) => item.id !== row.id)]);
            setCreating(false);
            setMessage(row.enabled ? "Сохранено." : "Сохранено. Рассылка выключена, пока Вы её не включите.");
          }}
        />
      ) : null}
      {rows.length === 0 && !creating ? (
        <p className="mt-3 text-[14px]">Своих рассылок пока нет.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="sheet px-4 py-4" data-custom-id={row.id}>
              {editing === row.id ? (
                <Editor
                  students={students}
                  initial={row}
                  id={row.id}
                  onCancel={() => setEditing(null)}
                  onSaved={(next) => {
                    setRows((current) => current.map((item) => (item.id === next.id ? next : item)));
                    setEditing(null);
                    setMessage("Сохранено.");
                  }}
                />
              ) : (
                <Summary
                  row={row}
                  onEdit={() => { setEditing(row.id); setMessage(null); }}
                  onDeleted={() => {
                    setRows((current) => current.filter((item) => item.id !== row.id));
                    setMessage("Рассылка удалена.");
                  }}
                  onToggle={async (enabled) => {
                    const response = await saveCustomMailing({ ...row, enabled });
                    if ("error" in response && response.error) {
                      setMessage(response.error);
                      return;
                    }
                    if ("row" in response && response.row) {
                      setRows((current) => current.map((item) => (item.id === response.row.id ? response.row : item)));
                    }
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {message ? <p className="mt-3 text-[14px]">{message}</p> : null}
    </section>
  );
}

function Summary({
  row,
  onEdit,
  onDeleted,
  onToggle,
}: {
  row: CustomMailingRow;
  onEdit: () => void;
  onDeleted: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const who = row.audience === "all" ? "все ученики" : "выбранные ученики";
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[16px] font-semibold">{row.name}</h4>
        <ToggleSwitch checked={row.enabled} onChange={onToggle} label={row.enabled ? "вкл" : "выкл"} />
      </div>
      <p className="mt-2 text-[14px]">{customScheduleLabel(row)}</p>
      <p className="mt-1 text-[14px]" style={{ color: "var(--muted)" }}>Кому: {who}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>Изменить</Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("Удалить эту рассылку? Письма, которые уже ушли, останутся в истории.")) return;
            setBusy(true);
            const response = await deleteCustomMailing(row.id);
            setBusy(false);
            if ("error" in response && response.error) return;
            onDeleted();
          }}
        >
          Удалить
        </Button>
      </div>
    </div>
  );
}

function Editor({
  id,
  initial,
  students,
  onCancel,
  onSaved,
}: {
  id?: string;
  initial: CustomMailingInput;
  students: Student[];
  onCancel: () => void;
  onSaved: (row: CustomMailingRow) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const picked = new Set(draft.studentIds.split(",").filter(Boolean));
  const time = `${String(draft.hour).padStart(2, "0")}:${String(draft.minute).padStart(2, "0")}`;

  function patch(partial: Partial<CustomMailingInput>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const response = await saveCustomMailing({ ...draft, id });
    setBusy(false);
    if ("error" in response && response.error) {
      setError(response.error);
      return;
    }
    if ("row" in response && response.row) onSaved(response.row);
  }

  async function look() {
    setBusy(true);
    setError(null);
    const studentId = draft.audience === "chosen" ? draft.studentIds.split(",").find(Boolean) ?? "" : students[0]?.id ?? "";
    const response = await previewCustomMailing({ subject: draft.subject, body: draft.body, studentId });
    setBusy(false);
    if ("error" in response && response.error) {
      setError(response.error);
      return;
    }
    if ("html" in response && response.html && response.subject) setPreview({ subject: response.subject, html: response.html });
  }

  return (
    <div className={id ? "" : "sheet mt-3 px-4 py-4"} data-custom-form>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-[16px] font-semibold">{id ? "Правка рассылки" : "Новая рассылка"}</h4>
        <ToggleSwitch checked={draft.enabled} onChange={(enabled) => patch({ enabled })} label={draft.enabled ? "вкл" : "выкл"} />
      </div>
      <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
        Название
        <input aria-label="Название рассылки" className="fld mt-1" value={draft.name} onChange={(event) => patch({ name: event.target.value })} />
      </label>
      <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
        Тема
        <input aria-label="Тема рассылки" className="fld mt-1" value={draft.subject} onChange={(event) => patch({ subject: event.target.value })} />
      </label>
      <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
        Текст
        <textarea
          aria-label="Текст рассылки"
          className="fld mt-1"
          style={{ minHeight: 140, height: "auto", paddingTop: 12, paddingBottom: 12 }}
          value={draft.body}
          onChange={(event) => patch({ body: event.target.value })}
        />
      </label>
      <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
        Подпись «Лиза Андреенко» добавится сама. Если напишете {"{имя}"}, подставится имя ученика.
      </p>
      <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
        Кому
        <select
          aria-label="Кому уходит рассылка"
          className="fld mt-1"
          value={draft.audience}
          onChange={(event) => patch({ audience: event.target.value === "chosen" ? "chosen" : "all" })}
        >
          <option value="all">все ученики</option>
          <option value="chosen">выбранные ученики</option>
        </select>
      </label>
      {draft.audience === "chosen" ? (
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
                    patch({ studentIds: [...next].join(",") });
                  }}
                />
                {student.name}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-[13px]" style={{ color: "var(--muted)" }}>
          Когда
          <select
            aria-label="Как часто уходит рассылка"
            className="fld mt-1"
            value={draft.cadence}
            onChange={(event) => patch({ cadence: event.target.value as CustomCadence })}
          >
            <option value="once">в дату</option>
            <option value="weekly">каждую неделю</option>
            <option value="monthly">каждый месяц</option>
          </select>
        </label>
        {draft.cadence === "once" ? (
          <label className="text-[13px]" style={{ color: "var(--muted)" }}>
            Дата
            <input aria-label="Дата рассылки" className="fld mt-1" type="date" value={draft.runOn} onChange={(event) => patch({ runOn: event.target.value })} />
          </label>
        ) : null}
        {draft.cadence === "weekly" ? (
          <label className="text-[13px]" style={{ color: "var(--muted)" }}>
            День недели
            <select
              aria-label="День недели"
              className="fld mt-1"
              value={String(draft.weekday)}
              onChange={(event) => patch({ weekday: Number(event.target.value) })}
            >
              {WEEKDAYS.slice(1).map((label, index) => (
                <option key={label} value={String(index + 1)}>{label}</option>
              ))}
            </select>
          </label>
        ) : null}
        {draft.cadence === "monthly" ? (
          <label className="text-[13px]" style={{ color: "var(--muted)" }}>
            Число месяца
            <input
              aria-label="Число месяца"
              className="fld mt-1"
              inputMode="numeric"
              value={String(draft.monthDay)}
              onChange={(event) => patch({ monthDay: Number(event.target.value.replace(/[^\d]/g, "")) || 1 })}
            />
          </label>
        ) : null}
        <label className="text-[13px]" style={{ color: "var(--muted)" }}>
          Время по Москве
          <input
            aria-label="Время рассылки"
            className="fld mt-1"
            type="time"
            value={time}
            onChange={(event) => {
              const [hour, minute] = event.target.value.split(":");
              patch({ hour: Number(hour), minute: Number(minute) });
            }}
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-[14px]">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={busy}>{busy ? "Сохраняю..." : "Сохранить"}</Button>
        <Button type="button" variant="secondary" onClick={look} disabled={busy}>Посмотреть</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Закрыть</Button>
      </div>
      {preview ? (
        <div className="mt-3" data-custom-preview>
          <p className="text-[14px]">Тема: {preview.subject}</p>
          <iframe
            title="Превью своей рассылки"
            sandbox=""
            srcDoc={preview.html}
            className="mt-2 w-full rounded-[12px]"
            style={{ height: 360, border: "1px solid var(--border)", background: "#F6F1E8" }}
          />
        </div>
      ) : null}
    </div>
  );
}
