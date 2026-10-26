"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { anchorQuote } from "./quoteMatch";
import { caretRect, collectPageText, collectWritingText, offsetInCollected } from "./pageText";

export type Anchor = { quote: string; label: string; url: string; offset: number };

const TEXTUAL_INPUT = new Set(["", "text", "search", "url", "tel", "password", "email", "number"]);

type HostLike = {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
  parentElement?: HostLike | null;
  getAttribute?: (name: string) => string | null;
  dataset?: { notesUi?: string; annotateBtn?: string };
};

/** Панель заметок и поле режима правок не поднимают «Заметку».
 *  Обычный текст и поля ввода поднимают: цитату берут из выделения,
 *  а Delete и набор кнопка не перехватывает. */
export function blocksNote(node: HostLike | null | undefined): boolean {
  let el = node ?? null;
  while (el) {
    if (el.dataset?.notesUi === "1" || el.dataset?.annotateBtn !== undefined) return true;
    if (el.getAttribute?.("data-review-field") != null) return true;
    el = el.parentElement ?? null;
  }
  return false;
}

export function isTextField(node: HostLike | null | undefined): boolean {
  if (!node || blocksNote(node)) return false;
  const tag = node.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT" && TEXTUAL_INPUT.has((node.type ?? "text").toLowerCase())) return true;
  return false;
}

/** Фрагмент внутри input/textarea. Пустое и слишком короткое выделение не цитата. */
export function fieldQuote(value: string, start: number | null, end: number | null): string | null {
  if (start == null || end == null || end <= start) return null;
  const text = value.slice(start, end);
  if (text.trim().length < 2) return null;
  return text;
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

type Found = { text: string; offset: number; rect: DOMRect | null };

function readSelection(): Found | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && blocksNote(active)) return null;

  if (
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLInputElement && TEXTUAL_INPUT.has((active.type || "text").toLowerCase()))
  ) {
    const built = anchorQuote(
      fieldQuote(active.value, active.selectionStart, active.selectionEnd) ?? "",
      active.selectionStart ?? 0,
    );
    if (!built) return null;
    return { text: built.quote, offset: built.offset, rect: caretRect(active, built.offset) };
  }

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  if (blocksNote(hostOf(sel.anchorNode)) || blocksNote(hostOf(sel.focusNode))) return null;
  const text = sel.toString();
  if (text.trim().length < 2) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  const host = hostOf(sel.anchorNode);
  const collected = host?.closest(".writing-prose") ? collectWritingText() : collectPageText();
  const from = collected ? offsetInCollected(collected, sel.anchorNode, sel.anchorOffset) : null;
  const to = collected ? offsetInCollected(collected, sel.focusNode, sel.focusOffset) : null;
  if (collected && from != null && to != null && from !== to) {
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const built = anchorQuote(collected.text.slice(start, end), start);
    if (built) return { text: built.quote, offset: built.offset, rect };
  }
  const built = anchorQuote(text, 0);
  if (!built) return null;
  return { text: built.quote, offset: built.offset, rect };
}

function editsText(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return event.key === "Backspace" || event.key === "Delete" || event.key === "Enter" || event.key.length === 1;
}

export default function SelectionAnnotator({
  onAnnotate,
}: {
  onAnnotate: (anchor: Anchor) => void;
}) {
  const [btn, setBtn] = useState<{ x: number; y: number; anchor: Anchor } | null>(null);
  const pointing = useRef(false);

  useEffect(() => {
    let timer = 0;

    function evaluate() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const found = readSelection();
        if (!found) {
          setBtn(null);
          return;
        }
        const rect = found.rect;
        if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0)) {
          setBtn(null);
          return;
        }
        const x = Math.min(Math.max(rect.left + Math.min(rect.width / 2, 48), 90), window.innerWidth - 90);
        const y = Math.max(rect.top - 8, 46);
        setBtn({
          x,
          y,
          anchor: {
            quote: found.text,
            offset: found.offset,
            label: readableLabel(),
            url: window.location.pathname + window.location.search,
          },
        });
      }, 40);
    }

    function onPointerDown(event: PointerEvent) {
      if ((event.target as HTMLElement)?.closest?.("[data-annotate-btn]")) return;
      pointing.current = true;
      setBtn(null);
    }

    function onPointerUp(event: PointerEvent) {
      pointing.current = false;
      if ((event.target as HTMLElement)?.closest?.("[data-annotate-btn]")) return;
      evaluate();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (editsText(event)) setBtn(null);
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.shiftKey || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a")) evaluate();
    }

    function onSelectionChange() {
      if (pointing.current) return;
      evaluate();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  if (!btn) return null;

  return (
    <button
      data-annotate-btn=""
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        onAnnotate(btn.anchor);
        setBtn(null);
      }}
      className="annotate-pop flex items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
      style={{
        position: "fixed",
        left: btn.x,
        top: btn.y,
        height: 32,
        transform: "translate(-50%, -100%)",
        zIndex: 95,
        background: "var(--y)",
        color: "var(--deep)",
        boxShadow: "0 4px 14px rgba(43, 45, 92, 0.14)",
        whiteSpace: "nowrap",
      }}
    >
      <Pencil size={14} strokeWidth={2.25} />
      Заметка
    </button>
  );
}
