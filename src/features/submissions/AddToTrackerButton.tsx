"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Check } from "lucide-react";
import type { SubmissionType } from "@/generated/prisma/client";
import { addOpenCallToTracker } from "./actions";

const CHOICES: { type: SubmissionType; label: string }[] = [
  { type: "CONTEST", label: "Конкурс" },
  { type: "PUBLISHER", label: "Издательство" },
];

export default function AddToTrackerButton({
  openCallId,
  tracked,
}: {
  openCallId: string;
  tracked: boolean;
}) {
  const [added, setAdded] = useState(false);
  const [toast, setToast] = useState(false);
  const [ask, setAsk] = useState(false);
  const [pending, startTransition] = useTransition();
  const inTracker = tracked || added;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!ask) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAsk(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ask]);

  function choose(type: SubmissionType) {
    setAsk(false);
    startTransition(async () => {
      const result = await addOpenCallToTracker(openCallId, type);
      setAdded(true);
      if (result === "added") setToast(true);
    });
  }

  return (
    <>
      {inTracker ? (
        <button type="button" className="btn-y !h-9 !w-auto px-4 text-[13.5px]" disabled>
          Добавлено <Check size={14} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          className="btn-y !h-9 !w-auto px-4 text-[13.5px] inline-flex items-center gap-1.5"
          disabled={pending}
          onClick={() => setAsk(true)}
        >
          Добавить в трекер <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      )}
      {ask
        ? createPortal(
            <div className="site-choice-root">
              <button type="button" className="site-choice-backdrop" aria-label="Закрыть" onClick={() => setAsk(false)} />
              <div className="site-choice-card" role="dialog" aria-modal="true" aria-labelledby="tracker-type-title">
                <h2 id="tracker-type-title" className="heading text-[22px] font-semibold">Куда добавить?</h2>
                <div className="mt-4 flex flex-col gap-2">
                  {CHOICES.map((choice) => (
                    <button
                      key={choice.type}
                      type="button"
                      className="h-11 rounded-full text-[15px] font-semibold"
                      style={{ background: "#fff", color: "var(--ink)", border: "1.5px solid var(--border)" }}
                      onClick={() => choose(choice.type)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 h-10 w-full rounded-full text-[14px]"
                  style={{ color: "var(--muted)" }}
                  onClick={() => setAsk(false)}
                >
                  Отмена
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
      {toast
        ? createPortal(
            <div className="tracker-toast" role="status" aria-live="polite">
              Добавлено
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
