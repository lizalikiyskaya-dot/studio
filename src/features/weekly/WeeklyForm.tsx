"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitWeeklyTask } from "./actions";
import { WeeklyEditor, WeeklyPreview } from "./WeeklyAnswer";

export default function WeeklyForm({
  studentId,
  viewerId,
  weeklyTaskId,
  title,
  initialText,
}: {
  studentId: string;
  viewerId: string;
  weeklyTaskId: string;
  title: string;
  initialText: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [editing, setEditing] = useState(initialText.trim().length === 0);
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
      setEditing(false);
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
    <div className="weekly-compose mt-3" data-no-digest="">
      {editing ? (
        <WeeklyEditor viewerId={viewerId} value={text} onChange={setText} />
      ) : (
        <div>
          <WeeklyPreview viewerId={viewerId} title={title} text={text} />
          <button type="button" className="weekly-expand mt-2" onClick={() => setEditing(true)}>Править</button>
        </div>
      )}
      {editing ? (
        <div className="weekly-submit mt-3 flex flex-wrap items-center gap-3">
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
              : "Сразу 2 звёздочки. Наставник получит письмо о сдаче."}
          </span>
        </div>
      ) : null}
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
