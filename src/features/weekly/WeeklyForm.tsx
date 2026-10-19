"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitWeeklyTask } from "./actions";

export default function WeeklyForm({
  studentId,
  weeklyTaskId,
  initialText,
}: {
  studentId: string;
  weeklyTaskId: string;
  initialText: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const saved = initialText.trim().length > 0;

  function handleSubmit() {
    setMessage(null);
    startTransition(async () => {
      const result = await submitWeeklyTask(studentId, weeklyTaskId, text);
      if ("error" in result) {
        setMessage({ text: result.error, ok: false });
        return;
      }
      setMessage({
        text: result.awarded
          ? "Сдано. На счету плюс 2 звёздочки."
          : "Текст обновлён. Звёзды за эту неделю уже начислены.",
        ok: true,
      });
      router.refresh();
    });
  }

  return (
    <div className="mt-5">
      <label className="fld-label" style={{ marginTop: 0 }}>
        Ваш текст
        <textarea
          className="fld field-literary text-[17px] leading-relaxed"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Напишите здесь. Задание необязательное."
          rows={10}
          maxLength={20000}
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-y px-5 text-[14.5px]"
          style={{ height: 44, width: "auto" }}
          disabled={pending}
          onClick={handleSubmit}
        >
          {pending ? "Сохраняем…" : saved ? "Сохранить правку" : "Сдать задание"}
        </button>
        <span className="text-[13px]" style={{ color: "var(--muted)" }}>
          {saved
            ? "Повторная сдача этой недели звёзды не удваивает."
            : "Сразу 2 звёздочки. Проверка наставника не нужна."}
        </span>
      </div>
      {message ? (
        <p
          className="mt-4 rounded-[14px] px-4 py-2.5 text-[13.5px]"
          style={
            message.ok
              ? { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" }
              : { background: "var(--pill-red-bg)", color: "var(--pill-red-fg)" }
          }
          role="status"
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
