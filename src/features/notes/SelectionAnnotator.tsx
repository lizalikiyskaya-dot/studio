"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

export type Anchor = { quote: string; label: string; url: string };

// True if the node lives inside the notes panel itself (or the floating
// button), where we never want to offer annotation.
function insideNotesUi(node: Node | null): boolean {
  let el: HTMLElement | null =
    node instanceof HTMLElement ? node : (node?.parentElement ?? null);
  while (el) {
    if (el.dataset?.notesUi === "1" || el.dataset?.annotateBtn !== undefined) return true;
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

type Found = { text: string; rect: DOMRect | null };

// Read the current selection from either a focused textarea/input (whose
// internal selection never reaches window.getSelection) or the regular DOM.
function readSelection(): Found | null {
  const active = document.activeElement as HTMLElement | null;
  if (
    active &&
    (active.tagName === "TEXTAREA" || active.tagName === "INPUT") &&
    !insideNotesUi(active)
  ) {
    const field = active as HTMLTextAreaElement | HTMLInputElement;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    if (start != null && end != null && end > start) {
      return { text: field.value.substring(start, end), rect: field.getBoundingClientRect() };
    }
    return null;
  }

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = sel.toString();
  if (!text.trim() || insideNotesUi(sel.anchorNode)) return null;
  return { text, rect: sel.getRangeAt(0).getBoundingClientRect() };
}

export default function SelectionAnnotator({
  onAnnotate,
}: {
  onAnnotate: (anchor: Anchor) => void;
}) {
  const [btn, setBtn] = useState<{ x: number; y: number; anchor: Anchor } | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function evaluate() {
      // Defer so the browser finalizes the selection after the event.
      window.setTimeout(() => {
        const found = readSelection();
        if (!found || found.text.trim().length < 2) {
          setBtn(null);
          return;
        }

        // Prefer the pointer position (works for both DOM and textarea
        // selections); fall back to the selection/field rectangle.
        let x = pointer.current?.x ?? 0;
        let y = pointer.current?.y ?? 0;
        if (!x && !y) {
          if (!found.rect) return;
          x = found.rect.left + found.rect.width / 2;
          y = found.rect.top;
        }
        x = Math.min(Math.max(x, 90), window.innerWidth - 90);
        y = Math.max(y - 16, 46);

        const raw = found.text.trim();
        setBtn({
          x,
          y,
          anchor: {
            quote: raw.length > 280 ? raw.slice(0, 280) + "…" : raw,
            label: readableLabel(),
            url: window.location.pathname + window.location.search,
          },
        });
      }, 10);
    }

    function onMouseUp(e: MouseEvent) {
      if ((e.target as HTMLElement)?.closest?.("[data-annotate-btn]")) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      evaluate();
    }

    function onKeyUp(e: KeyboardEvent) {
      // Only react to keyboard selection gestures (Shift+arrows, Ctrl/Cmd+A).
      if (e.shiftKey || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a")) {
        pointer.current = null; // use rect-based positioning
        evaluate();
      }
    }

    function onMouseDown(e: MouseEvent) {
      // Don't dismiss when the click lands on our floating button.
      if ((e.target as HTMLElement)?.closest?.("[data-annotate-btn]")) return;
      setBtn(null);
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  if (!btn) return null;

  return (
    <button
      data-annotate-btn=""
      // Prevent the mousedown from stealing focus / collapsing the selection
      // before our click handler captures the quote.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onAnnotate(btn.anchor);
        setBtn(null);
        window.getSelection()?.removeAllRanges();
        (document.activeElement as HTMLElement | null)?.blur?.();
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
        cursor: "pointer",
      }}
    >
      <MessageSquarePlus size={13} />
      Заметка
    </button>
  );
}
