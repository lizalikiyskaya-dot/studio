"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { previewLetterTemplate, resetLetterTemplateAction, saveLetterTemplateAction } from "@/features/mail/actions";
import type { LetterEditorRow } from "@/lib/letterTemplateStore";

export default function LetterTemplates({ ready, rows }: { ready: boolean; rows: LetterEditorRow[] }) {
  const [current, setCurrent] = useState<string>(rows.find((item) => item.key === "weekly-task")?.key ?? rows[0]?.key ?? "platform");
  const [drafts, setDrafts] = useState(rows);
  const [message, setMessage] = useState<string | null>(null);
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const row = drafts.find((item) => item.key === current) ?? drafts[0];

  function patch(partial: Partial<LetterEditorRow>) {
    setDrafts((items) => items.map((item) => (item.key === current ? { ...item, ...partial } : item)));
  }

  async function look(next = row) {
    if (!next) return;
    const response = await previewLetterTemplate(next.key, next.subject, next.body);
    if ("error" in response && response.error) {
      setMessage(response.error);
      return;
    }
    if ("html" in response && response.html) setHtml(response.html);
  }

  async function save() {
    if (!row) return;
    setBusy(true);
    const response = await saveLetterTemplateAction(row.key, row.subject, row.body);
    setBusy(false);
    if ("error" in response && response.error) {
      setMessage(response.error);
      return;
    }
    const standard = row.subject.trim() === row.standardSubject.trim() && row.body.trim() === row.standardBody.trim();
    patch({ custom: !standard });
    setMessage(standard ? "Стандартный." : "Сохранено.");
    await look({ ...row, custom: !standard });
  }

  async function reset() {
    if (!row) return;
    setBusy(true);
    const response = await resetLetterTemplateAction(row.key);
    setBusy(false);
    if ("error" in response && response.error) {
      setMessage(response.error);
      return;
    }
    const next = { ...row, subject: row.standardSubject, body: row.standardBody, custom: false };
    patch(next);
    setMessage("Стандартный.");
    await look(next);
  }

  useEffect(() => {
    const shown = drafts.find((item) => item.key === current) ?? drafts[0];
    if (!shown) return;
    let cancel = false;
    previewLetterTemplate(shown.key, shown.subject, shown.body).then((response) => {
      if (cancel || !("html" in response) || !response.html) return;
      setHtml(response.html);
    });
    return () => {
      cancel = true;
    };
  }, [current]);

  if (!row) return null;

  return (
    <section id="letter-templates" className="sheet mb-6 px-4 py-4 sm:px-5" data-letter-editor style={{ overflow: "hidden" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px]">Шаблоны</h2>
        <span className="text-[13px]" style={{ color: "var(--muted)" }}>{row.custom ? "Свой текст" : "Стандартный"}</span>
      </div>
      {!ready ? <p className="mt-2 text-[14px]">Таблица ещё не подключена. Нужен файл docs/sql/2026-10-20-mail-broadcast.sql.</p> : null}
      <label className="mt-4 block text-[13px]" style={{ color: "var(--muted)" }}>
        Шаблон
        <select
          aria-label="Шаблон для правки"
          className="fld mt-1"
          value={row.key}
          onChange={(event) => {
            setCurrent(event.target.value);
            setHtml("");
            setMessage(null);
          }}
        >
          {drafts.map((item) => (
            <option key={item.key} value={item.key}>{item.title}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
        Тема
        <input
          aria-label="Тема шаблона"
          className="fld mt-1"
          value={row.subject}
          onChange={(event) => patch({ subject: event.target.value })}
        />
      </label>
      <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
        Текст
        <textarea
          aria-label="Текст шаблона"
          className="fld mt-1"
          style={{ minHeight: 220, height: "auto", paddingTop: 12, paddingBottom: 12 }}
          value={row.body}
          onChange={(event) => patch({ body: event.target.value })}
        />
      </label>
      <p className="mt-2 text-[13px]" style={{ color: "var(--muted)" }}>{row.placeholders}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={busy || !ready}>{busy ? "Сохраняю..." : "Сохранить"}</Button>
        <Button type="button" variant="secondary" onClick={reset} disabled={busy || !ready}>Вернуть стандартный</Button>
        <Button type="button" variant="secondary" onClick={() => look()} disabled={busy}>Посмотреть</Button>
      </div>
      {message ? <p className="mt-3 text-[14px]">{message}</p> : null}
      {html ? (
        <iframe
          title="Превью шаблона"
          sandbox=""
          srcDoc={html}
          className="mt-3 w-full rounded-[12px]"
          style={{ height: 320, border: "1px solid var(--border)", background: "#F6F1E8" }}
        />
      ) : null}
    </section>
  );
}
