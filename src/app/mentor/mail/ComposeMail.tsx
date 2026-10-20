"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { loadTemplateDraft, previewMentorMail, sendMentorMail } from "@/features/mail/actions";

type MentorTemplate = "blank" | "platform" | "weekly" | "quote";

const OPTIONS: { value: MentorTemplate; label: string }[] = [
  { value: "blank", label: "Пустое письмо" },
  { value: "platform", label: "Отчёт об обновлениях" },
  { value: "weekly", label: "Задание недели" },
  { value: "quote", label: "Цитата дня" },
];

type Student = { id: string; name: string; email: string };

export default function ComposeMail({ students }: { students: Student[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"compose" | "preview" | "confirm">("compose");
  const [template, setTemplate] = useState<MentorTemplate>("blank");
  const [picked, setPicked] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const chosen = students.filter((student) => picked.includes(student.id));
  const [ready, setReady] = useState(true);

  async function chooseTemplate(next: MentorTemplate) {
    setTemplate(next);
    setStep("compose");
    if (next === "blank") {
      setSubject("");
      setBody("");
      setReady(true);
      setError(null);
      return;
    }
    setBusy(true);
    const filled = await loadTemplateDraft(next);
    setBusy(false);
    if ("error" in filled && filled.error) {
      setError(filled.error);
      return;
    }
    if (!("subject" in filled)) return;
    setSubject(filled.subject);
    setBody(filled.body);
    setReady(filled.ready);
    setError(filled.reason ?? null);
  }

  function toggle(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setPicked(picked.length === students.length ? [] : students.map((student) => student.id));
  }

  async function showPreview() {
    setError(null);
    if (chosen.length === 0) {
      setError("Выберите хотя бы одного ученика.");
      return;
    }
    if (!ready) {
      setError(error ?? "Этот шаблон сейчас не из чего собрать.");
      return;
    }
    setBusy(true);
    const response = await previewMentorMail({
      template,
      subject,
      body,
      studentId: chosen[0].id,
    });
    setBusy(false);
    if ("error" in response && response.error) {
      setError(response.error);
      return;
    }
    if (!("html" in response) || !response.html) return;
    setPreviewSubject(response.subject);
    setPreviewHtml(response.html);
    setStep("preview");
  }

  async function send() {
    setBusy(true);
    setError(null);
    const response = await sendMentorMail({
      template,
      subject,
      body,
      studentIds: picked,
    });
    setBusy(false);
    if ("error" in response && response.error) {
      setError(response.error);
      return;
    }
    if ("sent" in response) {
      setResult(`Ушло: ${response.sent}. Не ушло: ${response.failed}.`);
      setOpen(false);
      setStep("compose");
      setPicked([]);
    }
  }

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => { setOpen(true); setStep("compose"); setResult(null); }}>
          Написать письмо
        </Button>
        {result ? <p className="text-[14px]">{result}</p> : null}
      </div>

      {open ? (
        <section className="sheet mt-4 px-4 py-4 sm:px-5" data-compose-step={step} style={{ overflow: "hidden" }}>
          {step === "compose" ? (
            <div>
              <h2 className="text-[20px]">Новое письмо</h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" className="btn-y" style={{ height: 36, padding: "0 14px" }} onClick={toggleAll}>
                  {picked.length === students.length && students.length > 0 ? "Снять всех" : "Все ученики"}
                </button>
                <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                  Выбрано: {picked.length}
                </span>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {students.map((student) => (
                  <li key={student.id}>
                    <label className="flex items-start gap-2 text-[14px]">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={picked.includes(student.id)}
                        onChange={() => toggle(student.id)}
                      />
                      <span>
                        {student.name}
                        <span className="block text-[12px]" style={{ color: "var(--muted)" }}>{student.email}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <label className="mt-4 block text-[13px]" style={{ color: "var(--muted)" }}>
                Шаблон
                <select
                  aria-label="Шаблон письма"
                  className="fld mt-1"
                  value={template}
                  onChange={(event) => chooseTemplate(event.target.value as MentorTemplate)}
                >
                  {OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
                Тема
                <input aria-label="Тема письма" className="fld mt-1" value={subject} onChange={(event) => setSubject(event.target.value)} />
              </label>
              <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
                Текст
                <textarea
                  aria-label="Текст письма"
                  className="fld mt-1"
                  style={{ minHeight: 180, height: "auto", paddingTop: 12, paddingBottom: 12 }}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
              </label>
              {error ? <p className="mt-3 text-[14px]">{error}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={showPreview} disabled={busy}>Посмотреть</Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Закрыть</Button>
              </div>
            </div>
          ) : null}

          {step === "preview" ? (
            <div>
              <h2 className="text-[20px]">Так письмо уйдёт</h2>
              <p className="mt-1 text-[14px]">Тема: {previewSubject}</p>
              <iframe
                title="Превью письма"
                sandbox=""
                srcDoc={previewHtml}
                className="mt-3 w-full rounded-[12px]"
                style={{ height: 520, border: "1px solid var(--border)", background: "#F6F1E8" }}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={() => setStep("confirm")}>Дальше</Button>
                <Button type="button" variant="secondary" onClick={() => setStep("compose")}>Назад</Button>
              </div>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div data-confirm-count={chosen.length}>
              <h2 className="text-[22px]">Отправить {chosen.length} {chosen.length === 1 ? "ученику" : "ученикам"}?</h2>
              <ul className="mt-3 space-y-1 text-[15px]">
                {chosen.map((student) => (
                  <li key={student.id}>{student.name}</li>
                ))}
              </ul>
              {error ? <p className="mt-3 text-[14px]">{error}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" onClick={send} disabled={busy}>{busy ? "Отправляю..." : "Отправить"}</Button>
                <Button type="button" variant="secondary" onClick={() => setStep("preview")}>Назад</Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
