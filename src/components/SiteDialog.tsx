"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AlertReq = { kind: "alert"; message: string; resolve: () => void };
type ConfirmReq = { kind: "confirm"; message: string; resolve: (ok: boolean) => void };
type ChoiceReq = {
  kind: "choice";
  message: string;
  yes: string;
  no: string;
  resolve: (value: "yes" | "no" | "dismiss") => void;
};
type PromptReq = { kind: "prompt"; label: string; value: string; resolve: (value: string | null) => void };
type Req = AlertReq | ConfirmReq | ChoiceReq | PromptReq;

let enqueue: ((req: Req) => void) | null = null;
const waiting: Req[] = [];

function push(req: Req) {
  if (enqueue) {
    enqueue(req);
    return;
  }
  waiting.push(req);
  queueMicrotask(() => {
    if (!enqueue) return;
    const queued = waiting.splice(0);
    for (const item of queued) enqueue(item);
  });
}

export function siteAlert(message: string) {
  return new Promise<void>((resolve) => push({ kind: "alert", message, resolve }));
}

export function siteConfirm(message: string) {
  return new Promise<boolean>((resolve) => push({ kind: "confirm", message, resolve }));
}

/** Два явных ответа. Закрытие окна — «dismiss», само действие не подтверждено. */
export function siteChoice(message: string, labels: { yes: string; no: string }) {
  return new Promise<"yes" | "no" | "dismiss">((resolve) =>
    push({ kind: "choice", message, yes: labels.yes, no: labels.no, resolve }),
  );
}

export function sitePrompt(label: string, value = "") {
  return new Promise<string | null>((resolve) => push({ kind: "prompt", label, value, resolve }));
}

export function SiteDialogHost() {
  const [current, setCurrent] = useState<Req | null>(null);
  const currentRef = useRef<Req | null>(null);
  const queueRef = useRef<Req[]>([]);
  const draftRef = useRef("");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const finishRef = useRef<(result: boolean | "dismiss") => void>(() => {});

  function open(req: Req) {
    currentRef.current = req;
    const nextDraft = req.kind === "prompt" ? req.value : "";
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setCurrent(req);
  }

  function finish(result: boolean | "dismiss") {
    const req = currentRef.current;
    if (!req) return;
    if (req.kind === "alert") req.resolve();
    else if (req.kind === "confirm") req.resolve(result === true);
    else if (req.kind === "choice") req.resolve(result === "dismiss" ? "dismiss" : result ? "yes" : "no");
    else req.resolve(result === true ? draftRef.current : null);
    const next = queueRef.current.shift() ?? null;
    if (next) open(next);
    else {
      currentRef.current = null;
      setCurrent(null);
    }
  }

  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    enqueue = (req) => {
      if (currentRef.current) queueRef.current.push(req);
      else open(req);
    };
    const queued = waiting.splice(0);
    for (const item of queued) enqueue(item);
    return () => {
      enqueue = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const req = current;
    const timer = window.setTimeout(() => {
      if (req.kind === "prompt") inputRef.current?.focus();
      else if (req.kind === "choice") noRef.current?.focus();
      else primaryRef.current?.focus();
    }, 0);
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finishRef.current(req.kind === "choice" ? "dismiss" : false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [current]);

  if (!current || typeof document === "undefined") return null;

  const title = current.kind === "prompt" ? current.label : current.kind === "choice" ? current.message : "Сообщение";
  const primary =
    current.kind === "alert" ? "Хорошо" : current.kind === "prompt" ? "Сохранить" : current.kind === "choice" ? current.yes : "Да";
  const secondary = current.kind === "choice" ? current.no : "Отмена";

  return createPortal(
    <div className="site-dialog-root">
      <button
        type="button"
        className="site-dialog-backdrop"
        aria-label="Закрыть"
        onClick={() => finish(current.kind === "choice" ? "dismiss" : false)}
      />
      <div className="site-dialog-card" role="dialog" aria-modal="true" aria-label={title}>
        {current.kind === "prompt" ? (
          <>
            <div className="site-dialog-title">{current.label}</div>
            <input
              ref={inputRef}
              className="site-dialog-input"
              value={draft}
              onChange={(event) => {
                draftRef.current = event.target.value;
                setDraft(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  finish(true);
                }
              }}
            />
          </>
        ) : (
          <p className="site-dialog-message">{current.message}</p>
        )}
        <div className="site-dialog-actions">
          {current.kind !== "alert" ? (
            <button
              ref={current.kind === "choice" ? noRef : undefined}
              type="button"
              className="site-dialog-secondary"
              onClick={() => finish(false)}
            >
              {secondary}
            </button>
          ) : null}
          <button ref={primaryRef} type="button" className="site-dialog-primary" onClick={() => finish(true)}>
            {primary}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
