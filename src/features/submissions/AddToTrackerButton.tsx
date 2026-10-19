"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, Check } from "lucide-react";
import { addOpenCallToTracker } from "./actions";

export default function AddToTrackerButton({
  openCallId,
  tracked,
}: {
  openCallId: string;
  tracked: boolean;
}) {
  const [added, setAdded] = useState(false);
  const [toast, setToast] = useState(false);
  const [pending, startTransition] = useTransition();
  const inTracker = tracked || added;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {inTracker ? (
        <button type="button" className="btn-y !h-9 !w-auto px-4 text-[13.5px]" disabled>
          Добавлено <Check size={14} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          className="btn-y !h-9 !w-auto px-4 text-[13.5px]"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await addOpenCallToTracker(openCallId);
              setAdded(true);
              if (result === "added") setToast(true);
            });
          }}
        >
          Добавить в трекер <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      )}
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
