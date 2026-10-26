"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Heading2, Italic, List, ListOrdered, Redo2, TextQuote, Undo2 } from "lucide-react";
import { loadBlocks, readBlocks, saveBlocks, writeBlocks, type ContentFormat } from "./richText";

type Tool = "bold" | "italic" | "heading" | "list" | "numbers" | "quote";

const TOOLS: { id: Tool; label: string; icon: typeof Bold }[] = [
  { id: "bold", label: "Жирный", icon: Bold },
  { id: "italic", label: "Курсив", icon: Italic },
  { id: "heading", label: "Заголовок", icon: Heading2 },
  { id: "list", label: "Список", icon: List },
  { id: "numbers", label: "Нумерованный список", icon: ListOrdered },
  { id: "quote", label: "Цитата", icon: TextQuote },
];

function savedKey(content: string, format: ContentFormat) {
  return `${format}\n${content}`;
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
  const [active, setActive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    writeBlocks(el, loadBlocks(value, format));
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
    onChange(saved.content, saved.format);
    rememberActive();
  }

  function restore(key: string) {
    const el = ref.current;
    if (!el) return;
    const nl = key.indexOf("\n");
    const nextFormat = key.slice(0, nl) === "markdown" ? "markdown" : "plain";
    writeBlocks(el, loadBlocks(key.slice(nl + 1), nextFormat));
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
      setActive({});
      return;
    }
    let node: Node | null = selection.anchorNode;
    const names = new Set<string>();
    while (node && node !== el) {
      if (node instanceof Element) names.add(node.nodeName);
      node = node.parentNode;
    }
    setActive({
      bold: names.has("STRONG") || names.has("B"),
      italic: names.has("EM") || names.has("I"),
      heading: names.has("H1") || names.has("H2") || names.has("H3"),
      quote: names.has("BLOCKQUOTE"),
      list: names.has("UL"),
      numbers: names.has("OL"),
    });
  }

  function apply(tool: Tool) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (tool === "bold") document.execCommand("bold");
    if (tool === "italic") document.execCommand("italic");
    if (tool === "list") document.execCommand("insertUnorderedList");
    if (tool === "numbers") document.execCommand("insertOrderedList");
    if (tool === "heading") document.execCommand("formatBlock", false, active.heading ? "p" : "h2");
    if (tool === "quote") document.execCommand("formatBlock", false, active.quote ? "p" : "blockquote");
    publish();
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

  const empty = value.trim() === "";

  return (
    <div className={`writing-editor writing-editor-${variant}`}>
      <div className="writing-toolbar">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              className={`writing-tool${active[tool.id] ? " is-on" : ""}`}
              aria-label={tool.label}
              title={tool.label}
              aria-pressed={!!active[tool.id]}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => apply(tool.id)}
            >
              <Icon size={15} />
            </button>
          );
        })}
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
      />
    </div>
  );
}
