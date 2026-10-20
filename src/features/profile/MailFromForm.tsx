"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { saveMailSender } from "@/features/mail/actions";
import type { MailSenderInput, SmtpPublic } from "@/lib/mailSender";

export default function MailFromForm({
  ready,
  initial,
  smtp,
  warning,
}: {
  ready: boolean;
  initial: MailSenderInput;
  smtp: SmtpPublic;
  warning: string | null;
}) {
  const [fromName, setFromName] = useState(initial.fromName);
  const [fromEmail, setFromEmail] = useState(initial.fromEmail);
  const [replyTo, setReplyTo] = useState(initial.replyTo);
  const [message, setMessage] = useState<string | null>(warning);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await saveMailSender({ fromName, fromEmail, replyTo });
    setBusy(false);
    if ("error" in response && response.error) {
      setMessage(response.error);
      return;
    }
    setMessage(("warning" in response && response.warning) || "Сохранено.");
  }

  return (
    <section className="sheet mb-6 px-4 py-4 sm:px-5" data-mail-settings style={{ overflow: "hidden" }}>
      <h2 className="text-[20px]">От кого уходят письма</h2>
      {smtp.configured ? (
        <p className="mt-2 text-[14px]">Сейчас сервер входит как {smtp.user}.</p>
      ) : (
        <p className="mt-2 text-[14px]">SMTP не настроен, письма не уйдут.</p>
      )}
      {!ready ? (
        <p className="mt-3 text-[14px]">Столбцов ещё нет. Один раз нужен файл docs/sql/2026-10-20-mail-from.sql.</p>
      ) : (
        <>
          <label className="mt-4 block text-[13px]" style={{ color: "var(--muted)" }}>
            Имя отправителя
            <input aria-label="Имя отправителя" className="fld mt-1" value={fromName} onChange={(event) => setFromName(event.target.value)} />
          </label>
          <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
            Адрес отправителя
            <input aria-label="Адрес отправителя" className="fld mt-1" value={fromEmail} onChange={(event) => setFromEmail(event.target.value)} placeholder={smtp.user || ""} />
          </label>
          <label className="mt-3 block text-[13px]" style={{ color: "var(--muted)" }}>
            Адрес для ответа
            <input aria-label="Адрес для ответа" className="fld mt-1" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} />
          </label>
          <Button className="mt-4" type="button" onClick={save} disabled={busy}>{busy ? "Сохраняю..." : "Сохранить"}</Button>
        </>
      )}
      {message ? <p className="mt-3 text-[14px]">{message}</p> : null}
    </section>
  );
}
