"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus } from "lucide-react";

export type Anchor = { quote: string; label: string; url: string };

const TEXTUAL_INPUT = new Set(["", "text", "search", "url", "tel", "password", "email", "number"]);

type HostLike = {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
  parentElement?: HostLike | null;
  getAttribute?: (name: string) => string | null;
  dataset?: { notesUi?: string; annotateBtn?: string };
};

/** Поле, в котором человек правит текст, или сама панель заметок.
 *  Выделение там не должно поднимать «Заметка»: иначе кнопка съедает
 *  Delete, Backspace и замену набора. */
export function blocksNote(node: HostLike | null | undefined): boolean {
  let el = node ?? null;
  while (el) {
    if (el.dataset?.notesUi === "1" || el.dataset?.annotateBtn !== undefined) return true;
    if (el.getAttribute?.("data-review-field") != null) return true;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT" && TEXTUAL_INPUT.has((el.type ?? "text").toLowerCase())) return true;
    const role = el.getAttribute?.("role");
    if (role === "textbox" || role === "searchbox") return true;
    el = el.parentElement ?? null;
  }
  return false;
}

function hostOf(node: Node | null): HTMLElement | null {
  if (!node) return null;
  return node instanceof HTMLElement ? node : node.parentElement;
}

function readableLabel(): string {
  const title = document.querySelector(".page-title")?.textContent?.trim();
  if (title) return title;
  const h1 = document.querySelector("h1")?.textContent?.trim();
  return h1 || document.title || "Страница";
}

type Found = { text: string; rect: DOMRect | null };

// Выделение в поле ввода и в режиме правок не предлагаем заметить: человек
// выделяет, чтобы удалить или заменить. Кнопка остаётся на обычном тексте страницы.
function readSelection(): Found | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && blocksNote(active)) return null;

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  if (blocksNote(hostOf(sel.anchorNode)) || blocksNote(hostOf(sel.focusNode))) return null;
  const text = sel.toString();
  if (!text.trim()) return null;
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
        const active = document.activeElement;
        if (active instanceof HTMLElement && blocksNote(active)) return;
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
        cursor: "pointer",
      }}
    >
      <MessageSquarePlus size={13} />
      Заметка
    </button>
  );
}
