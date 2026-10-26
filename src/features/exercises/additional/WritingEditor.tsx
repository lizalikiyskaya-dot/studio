"use client";

import { useEffect, useRef, useState } from "react";
import { AlignJustify, Bold, Heading2, Italic, List, ListOrdered, Redo2, TextQuote, Underline, Undo2 } from "lucide-react";
import {
  applyTextSize,
  loadBlocks,
  readBlocks,
  saveBlocks,
  toggleJustify,
  toggleList,
  toggleUnderline,
  writeBlocks,
  type CaretPoint,
  type ContentFormat,
  type TextSize,
} from "./richText";

type Tool = "bold" | "italic" | "underline" | "heading" | "list" | "numbers" | "quote" | "justify";

const TOOLS: { id: Tool; label: string; icon: typeof Bold }[] = [
  { id: "bold", label: "Жирный", icon: Bold },
  { id: "italic", label: "Курсив", icon: Italic },
  { id: "underline", label: "Подчёркивание", icon: Underline },
  { id: "heading", label: "Заголовок", icon: Heading2 },
  { id: "list", label: "Список", icon: List },
  { id: "numbers", label: "Нумерованный список", icon: ListOrdered },
  { id: "quote", label: "Цитата", icon: TextQuote },
  { id: "justify", label: "По ширине", icon: AlignJustify },
];

const SIZES: { id: TextSize | "m"; label: string }[] = [
  { id: "s", label: "Мелкий" },
  { id: "m", label: "Обычный" },
  { id: "l", label: "Крупный" },
  { id: "xl", label: "Крупнее" },
];

function savedKey(content: string, format: ContentFormat) {
  return `${format}\n${content}`;
}

function topBlock(root: HTMLElement, node: Node | null): HTMLElement | null {
  let current: Node | null = node;
  if (!current || !root.contains(current)) return null;
  while (current.parentNode && current.parentNode !== root) current = current.parentNode;
  return current instanceof HTMLElement ? current : null;
}

function blockIndex(root: HTMLElement, node: Node | null) {
  const top = topBlock(root, node);
  if (!top) return 0;
  const index = [...root.children].indexOf(top);
  return index < 0 ? 0 : index;
}

function pointIn(root: HTMLElement, node: Node, offset: number): CaretPoint {
  const block = blockIndex(root, node);
  const top = topBlock(root, node);
  if (!top) return { block, offset: 0 };
  const range = document.createRange();
  range.selectNodeContents(top);
  try {
    range.setEnd(node, Math.min(offset, node.nodeType === Node.TEXT_NODE ? (node.textContent?.length ?? 0) : offset));
  } catch {
    return { block, offset: 0 };
  }
  return { block, offset: range.toString().length };
}

function caretOffset(root: HTMLElement) {
  const selection = document.getSelection();
  if (!selection || !selection.anchorNode || !root.contains(selection.anchorNode)) return null;
  const range = document.createRange();
  range.selectNodeContents(root);
  try {
    range.setEnd(selection.anchorNode, selection.anchorOffset);
  } catch {
    return null;
  }
  return range.toString().length;
}

function restoreCaret(root: HTMLElement, offset: number) {
  const selection = document.getSelection();
  if (!selection) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let left = offset;
  let last: Text | null = null;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    last = text;
    if (left <= text.data.length) {
      const range = document.createRange();
      range.setStart(text, Math.max(0, left));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    left -= text.data.length;
  }
  const host = last?.parentElement ?? root.querySelector("p, li, h2, blockquote");
  if (!host) return;
  const range = document.createRange();
  range.selectNodeContents(host);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export default function WritingEditor({
  value,
  format,
  onChange,
  placeholder = "Напишите здесь",
  variant = "card",
  toolbarExtra,
}: {
  value: string;
  format: ContentFormat;
  onChange: (content: string, format: ContentFormat) => void;
  placeholder?: string;
  variant?: "card" | "focus";
  toolbarExtra?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const history = useRef<string[]>([savedKey(value, format)]);
  const index = useRef(0);
  const committed = useRef(savedKey(value, format));
  const savedRange = useRef<Range | null>(null);
  const [pressed, setPressed] = useState<Record<string, boolean>>({});
  const [size, setSize] = useState<TextSize | "m">("m");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    writeBlocks(el, loadBlocks(value, format));
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      // Старые браузеры оставляют свой абзац. Enter всё равно начинает новый блок.
    }
    // Значение снаружи нужно только при открытии редактора.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function publish(fromHistory = false) {
    const el = ref.current;
    if (!el) return;
    const saved = saveBlocks(readBlocks(el));
    const key = savedKey(saved.content, saved.format);
    if (!fromHistory && history.current[index.current] !== key) {
      history.current = history.current.slice(0, index.current + 1);
      history.current.push(key);
      index.current = history.current.length - 1;
    }
    rememberActive();
    // Фокус дописывает <br> в конец строки. Если текст тот же, сохранять нечего.
    if (key === committed.current) return;
    committed.current = key;
    onChange(saved.content, saved.format);
  }

  function restore(key: string) {
    const el = ref.current;
    if (!el) return;
    const nl = key.indexOf("\n");
    const nextFormat = key.slice(0, nl) === "markdown" ? "markdown" : "plain";
    writeBlocks(el, loadBlocks(key.slice(nl + 1), nextFormat));
    if (key === committed.current) return;
    committed.current = key;
    onChange(key.slice(nl + 1), nextFormat);
  }

  function undo() {
    if (index.current === 0) return;
    index.current -= 1;
    restore(history.current[index.current]);
  }

  function redo() {
    if (index.current >= history.current.length - 1) return;
    index.current += 1;
    restore(history.current[index.current]);
  }

  function rememberActive() {
    const el = ref.current;
    const selection = document.getSelection();
    if (!el || !selection || !el.contains(selection.anchorNode)) {
      setPressed({});
      setSize("m");
      return;
    }
    let node: Node | null = selection.anchorNode;
    const names = new Set<string>();
    let nextSize: TextSize | "m" = "m";
    let justify = false;
    while (node && node !== el) {
      if (node instanceof Element) {
        names.add(node.nodeName);
        const marked = node.getAttribute("data-size");
        if (marked === "s" || marked === "l" || marked === "xl") nextSize = marked;
        if (node.getAttribute("data-align") === "justify") justify = true;
        if (node instanceof HTMLElement && node.style.textAlign === "justify") justify = true;
      }
      node = node.parentNode;
    }
    setSize(nextSize);
    setPressed({
      bold: names.has("STRONG") || names.has("B"),
      italic: names.has("EM") || names.has("I"),
      underline: names.has("U"),
      heading: names.has("H1") || names.has("H2") || names.has("H3"),
      quote: names.has("BLOCKQUOTE"),
      list: names.has("UL"),
      numbers: names.has("OL"),
      justify,
    });
  }

  function selectionPoints(el: HTMLElement) {
    const selection = document.getSelection();
    if (!selection?.anchorNode || !el.contains(selection.anchorNode)) return null;
    const focusNode = selection.focusNode && el.contains(selection.focusNode) ? selection.focusNode : selection.anchorNode;
    const focusOffset = focusNode === selection.focusNode ? selection.focusOffset : selection.anchorOffset;
    return {
      anchor: pointIn(el, selection.anchorNode, selection.anchorOffset),
      focus: pointIn(el, focusNode, focusOffset),
    };
  }

  function rewrite(next: ReturnType<typeof readBlocks>) {
    const el = ref.current;
    if (!el) return;
    const caret = caretOffset(el);
    writeBlocks(el, next);
    if (caret != null) restoreCaret(el, caret);
    publish();
  }

  function apply(tool: Tool) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (tool === "bold") document.execCommand("bold");
    if (tool === "italic") document.execCommand("italic");
    if (tool === "heading") document.execCommand("formatBlock", false, pressed.heading ? "p" : "h2");
    if (tool === "quote") document.execCommand("formatBlock", false, pressed.quote ? "p" : "blockquote");
    if (tool === "bold" || tool === "italic" || tool === "heading" || tool === "quote") {
      publish();
      return;
    }
    const blocks = readBlocks(el);
    if (tool === "list" || tool === "numbers") {
      const selection = document.getSelection();
      const start = blockIndex(el, selection?.anchorNode ?? null);
      const end = blockIndex(el, selection?.focusNode ?? selection?.anchorNode ?? null);
      rewrite(toggleList(blocks, start, end, tool === "list" ? "ul" : "ol"));
      return;
    }
    if (tool === "justify") {
      const selection = document.getSelection();
      const start = blockIndex(el, selection?.anchorNode ?? null);
      const end = blockIndex(el, selection?.focusNode ?? selection?.anchorNode ?? null);
      rewrite(toggleJustify(blocks, start, end));
      return;
    }
    const selection = document.getSelection();
    if (!selection || selection.isCollapsed) {
      document.execCommand("underline");
      publish();
      return;
    }
    const points = selectionPoints(el);
    if (!points) return;
    rewrite(toggleUnderline(blocks, points.anchor, points.focus));
  }

  function applySize(next: string) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const selection = document.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    const points = selectionPoints(el) ?? {
      anchor: { block: 0, offset: 0 },
      focus: { block: 0, offset: 0 },
    };
    const picked: TextSize | null = next === "s" || next === "l" || next === "xl" ? next : null;
    rewrite(applyTextSize(readBlocks(el), points.anchor, points.focus, picked));
    setSize(picked ?? "m");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      apply("bold");
    } else if (key === "i") {
      event.preventDefault();
      apply("italic");
    } else if (key === "u") {
      event.preventDefault();
      apply("underline");
    } else if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (key === "y" || (key === "z" && event.shiftKey)) {
      event.preventDefault();
      redo();
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    publish();
  }

  function rememberRange() {
    const el = ref.current;
    const selection = document.getSelection();
    if (!el || !selection || !selection.rangeCount || !selection.anchorNode || !el.contains(selection.anchorNode)) {
      savedRange.current = null;
      return;
    }
    savedRange.current = selection.getRangeAt(0).cloneRange();
  }

  const empty = value.trim() === "";

  return (
    <div className={`writing-editor writing-editor-${variant}`}>
      <div className="writing-toolbar" role="toolbar" aria-label="Оформление">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              className={`writing-tool${pressed[tool.id] ? " is-on" : ""}`}
              aria-label={tool.label}
              title={tool.label}
              aria-pressed={!!pressed[tool.id]}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => apply(tool.id)}
            >
              <Icon size={15} />
            </button>
          );
        })}
        <select
          className="writing-size"
          aria-label="Размер текста"
          title="Размер текста"
          value={size}
          onMouseDown={rememberRange}
          onChange={(event) => applySize(event.target.value)}
        >
          {SIZES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="writing-tool-gap" />
        <button
          type="button"
          className="writing-tool"
          aria-label="Отменить"
          title="Отменить"
          onMouseDown={(event) => event.preventDefault()}
          onClick={undo}
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          className="writing-tool"
          aria-label="Вернуть"
          title="Вернуть"
          onMouseDown={(event) => event.preventDefault()}
          onClick={redo}
        >
          <Redo2 size={15} />
        </button>
        {toolbarExtra ? <span className="writing-toolbar-extra">{toolbarExtra}</span> : null}
      </div>
      <div
        ref={ref}
        className={`writing-prose${empty ? " is-empty" : ""}`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Текст"
        data-placeholder={placeholder}
        spellCheck
        onInput={() => publish()}
        onKeyUp={rememberActive}
        onMouseUp={rememberActive}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onFocus={() => {
          try {
            document.execCommand("defaultParagraphSeparator", false, "p");
          } catch {
            // Enter остаётся новым абзацем и без этой команды.
          }
        }}
      />
    </div>
  );
}
