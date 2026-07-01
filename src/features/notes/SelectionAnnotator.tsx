"use client";

import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

export type Anchor = { quote: string; label: string; url: string };

// Walk up the DOM from a node; return true if the selection lives inside
// UI we should never annotate (the notes panel itself, editable fields,
// buttons). Selecting text inside a <textarea>/<input> is handled natively
// by the browser and never reaches window.getSelection() as text, so the
// main thing to exclude is our own panel (marked data-notes-ui).
function isExcluded(node: Node | null): boolean {
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (el) {
    if (el.dataset?.notesUi === "1") return true;
    const tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" || el.isContentEditable) return true;
    el = el.parentElement;
  }
  return false;
}

function readableLabel(): string {
  const title = document.querySelector(".page-title")?.textContent?.trim();
  if (title) return title;
  const h1 = document.querySelector("h1")?.textContent?.trim();
  return h1 || document.title || "Страница";
}

export default function SelectionAnnotator({
  onAnnotate,
}: {
  onAnnotate: (anchor: Anchor) => void;
}) {
  const [btn, setBtn] = useState<{ x: number; y: number; anchor: Anchor } | null>(null);

  useEffect(() => {
    function evaluate() {
      // Defer so the browser finalizes the selection after mouseup.
      window.setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setBtn(null);
          return;
        }
        const text = sel.toString().trim();
        if (text.length < 2 || isExcluded(sel.anchorNode)) {
          setBtn(null);
          return;
        }
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setBtn(null);
          return;
        }
        setBtn({
          x: Math.min(Math.max(rect.left + rect.width / 2, 90), window.innerWidth - 90),
          y: Math.max(rect.top - 6, 44),
          anchor: {
            quote: text.length > 280 ? text.slice(0, 280) + "…" : text,
            label: readableLabel(),
            url: window.location.pathname + window.location.search,
          },
        });
      }, 10);
    }

    function onMouseDown(e: MouseEvent) {
      // Clicking the floating button shouldn't dismiss it before its onClick.
      if ((e.target as HTMLElement)?.closest?.("[data-annotate-btn]")) return;
      setBtn(null);
    }

    document.addEventListener("mouseup", evaluate);
    document.addEventListener("keyup", evaluate);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mouseup", evaluate);
      document.removeEventListener("keyup", evaluate);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  if (!btn) return null;

  return (
    <button
      data-annotate-btn
      onClick={() => {
        onAnnotate(btn.anchor);
        setBtn(null);
        window.getSelection()?.removeAllRanges();
      }}
      className="flex items-center gap-1.5 rounded-full text-[12px] font-medium px-3 py-1.5"
      style={{
        position: "fixed",
        left: btn.x,
        top: btn.y,
        transform: "translate(-50%, -100%)",
        zIndex: 95,
        background: "var(--ink)",
        color: "#fff",
        boxShadow: "0 4px 16px rgba(0,0,0,0.24)",
        whiteSpace: "nowrap",
      }}
    >
      <MessageSquarePlus size={13} />
      Заметка
    </button>
  );
}
