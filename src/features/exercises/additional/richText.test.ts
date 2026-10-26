import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findDestructive, sortSqlNames } from "../../../../scripts/sql-guard.mjs";
import {
  applyTextSize,
  loadBlocks,
  markdownToBlocks,
  plainToBlocks,
  readBlocks,
  saveBlocks,
  toggleJustify,
  toggleList,
  toggleUnderline,
  writeBlocks,
  type ContentFormat,
} from "./richText";

class MiniText {
  nodeType = 3;
  parentNode: MiniElement | null = null;
  constructor(public textContent: string) {}
}

class MiniElement {
  nodeType = 1;
  nodeName: string;
  className = "";
  parentNode: MiniElement | null = null;
  childNodes: Array<MiniElement | MiniText> = [];
  attrs: Record<string, string> = {};
  style: { textAlign: string; textDecoration: string } = { textAlign: "", textDecoration: "" };
  constructor(tag: string) {
    this.nodeName = tag.toUpperCase();
  }
  setAttribute(name: string, value: string) {
    this.attrs[name] = value;
  }
  getAttribute(name: string) {
    return this.attrs[name] ?? null;
  }
  get children() {
    return this.childNodes.filter((node) => node instanceof MiniElement);
  }
  get textContent(): string {
    return this.childNodes.map((node) => node.textContent ?? "").join("");
  }
  append(...nodes: Array<MiniElement | MiniText>) {
    for (const node of nodes) {
      node.parentNode = this;
      this.childNodes.push(node);
    }
  }
  replaceChildren(...nodes: Array<MiniElement | MiniText>) {
    this.childNodes = [];
    this.append(...nodes);
  }
}

Object.assign(globalThis, {
  Element: MiniElement,
  document: {
    createElement(tag: string) {
      return new MiniElement(tag);
    },
    createTextNode(text: string) {
      return new MiniText(text);
    },
  },
});

function throughEditor(content: string, format: ContentFormat) {
  const root = document.createElement("div");
  writeBlocks(root, loadBlocks(content, format));
  return saveBlocks(readBlocks(root));
}

const sql = fs.readFileSync("docs/sql/2026-10-27-free-section-format.sql", "utf8");

test("обычный текст возвращается как был, даже со звёздочками и решётками", () => {
  const source = "5 * 3 = 15\n# не заголовок\n- и не список\n\nвторая строка";
  const saved = saveBlocks(plainToBlocks(source));
  assert.equal(saved.format, "plain");
  assert.equal(saved.content, source);
  assert.deepEqual(loadBlocks(saved.content, saved.format), plainToBlocks(source));
});

test("оформление хранится markdown и собирается обратно", () => {
  const source = [
    "## Утро",
    "Герой **вышел** на *крыльцо*.",
    "- чай",
    "- письмо",
    "1. первый шаг",
    "2. второй шаг",
    "> тихий дом",
    "5 \\* 3 остаётся знаком",
  ].join("\n");
  const blocks = markdownToBlocks(source);
  const saved = saveBlocks(blocks);
  assert.equal(saved.format, "markdown");
  assert.deepEqual(markdownToBlocks(saved.content), blocks);
  assert.equal(saved.content.includes("<script"), false);
});

test("пустая карточка остаётся пустой строкой", () => {
  assert.deepEqual(saveBlocks([]), { content: "", format: "plain" });
  assert.deepEqual(saveBlocks(loadBlocks("", "plain")), { content: "", format: "plain" });
});

test("пустые строки не удваиваются при записи и чтении", () => {
  const plain = ["a\nb", "a\n\nb", "a\n\n\nb", "x\n\ny"];
  for (const source of plain) {
    const once = throughEditor(source, "plain");
    assert.deepEqual(once, { content: source, format: "plain" });
    let again = once;
    for (let pass = 0; pass < 4; pass++) again = throughEditor(again.content, again.format);
    assert.deepEqual(again, { content: source, format: "plain" });
  }

  const markdown = [
    "## Утро",
    "",
    "Герой **вышел** на *крыльцо*.",
    "",
    "- чай",
    "- **письмо**",
    "",
    "1. первый шаг",
    "2. *второй* шаг",
  ].join("\n");
  const marked = throughEditor(markdown, "markdown");
  assert.deepEqual(marked, { content: markdown, format: "markdown" });
  let repeat = marked;
  for (let pass = 0; pass < 4; pass++) repeat = throughEditor(repeat.content, repeat.format);
  assert.deepEqual(repeat, { content: markdown, format: "markdown" });
});

test("фокус дописывает br в конец абзаца и не меняет старый текст", () => {
  const source = "x\n\ny";
  const root = document.createElement("div");
  for (const line of source.split("\n")) {
    const paragraph = document.createElement("p");
    if (line) paragraph.append(document.createTextNode(line));
    paragraph.append(document.createElement("br"));
    root.append(paragraph);
  }
  const saved = saveBlocks(readBlocks(root));
  assert.deepEqual(saved, { content: source, format: "plain" });
  const again = throughEditor(saved.content, saved.format);
  assert.deepEqual(again, saved);
});

test("перенос внутри абзаца остаётся переносом, последний br — нет", () => {
  const paragraph = document.createElement("p");
  paragraph.append(document.createTextNode("a"), document.createElement("br"), document.createTextNode("b"), document.createElement("br"));
  const root = document.createElement("div");
  root.append(paragraph);
  assert.deepEqual(saveBlocks(readBlocks(root)), { content: "a\nb", format: "plain" });
});

test("список, подчёркивание, размер и ширина живут в тексте и рисуются обратно", () => {
  const source = [
    "::: Герой <u>вышел</u> на крыльцо.",
    "<small>тихо</small> и <huge>громко</huge>",
    "- чай",
    "- <u>письмо</u>",
    "::: 1. первый шаг",
    "::: 2. <big>второй</big> шаг",
  ].join("\n");
  const saved = throughEditor(source, "markdown");
  assert.equal(saved.format, "markdown");
  assert.equal(saved.content, source);
  const root = document.createElement("div");
  writeBlocks(root, loadBlocks(saved.content, saved.format));
  const list = root.childNodes[2] as unknown as MiniElement;
  assert.equal(list.nodeName, "UL");
  assert.equal(list.children.length, 2);
  const justified = root.childNodes[0] as unknown as MiniElement;
  assert.equal(justified.getAttribute("data-align"), "justify");
  assert.equal(justified.style.textAlign, "justify");
  const again = saveBlocks(readBlocks(root));
  assert.equal(again.content, source);
});

test("кнопки списка, ширины, размера и подчёркивания меняют блоки", () => {
  const prose = plainToBlocks("чай\nписьмо\nдом");
  const listed = toggleList(prose, 0, 1, "ul");
  assert.equal(listed[0]?.kind, "ul");
  assert.equal(listed[1]?.kind, "p");
  const numbered = toggleList(listed, 0, 0, "ol");
  assert.equal(numbered[0]?.kind, "ol");
  const back = toggleList(numbered, 0, 0, "ol");
  assert.equal(back[0]?.kind, "p");
  assert.equal(back[1]?.kind, "p");

  const wide = toggleJustify(prose, 1, 1);
  assert.equal(wide[1]?.align, "justify");
  assert.equal(toggleJustify(wide, 1, 1)[1]?.align, undefined);

  const sized = applyTextSize(prose, { block: 0, offset: 0 }, { block: 0, offset: 3 }, "l");
  assert.equal(sized[0]?.kind === "p" && sized[0].inlines[0]?.size, "l");
  const normal = applyTextSize(sized, { block: 0, offset: 0 }, { block: 0, offset: 3 }, null);
  assert.equal(normal[0]?.kind === "p" && normal[0].inlines.some((part) => part.size), false);

  const marked = toggleUnderline(prose, { block: 2, offset: 0 }, { block: 2, offset: 3 });
  const markedLine = marked[2];
  assert.equal(markedLine?.kind === "p" && markedLine.inlines[0]?.underline, true);
  const plain = saveBlocks(marked);
  assert.match(plain.content, /<u>дом<\/u>/);
  const cleared = toggleUnderline(marked, { block: 2, offset: 0 }, { block: 2, offset: 3 })[2];
  assert.equal(cleared?.kind === "p" && cleared.inlines.some((part) => part.underline), false);

  const list = toggleList(plainToBlocks("Герой вышел\nФонарь"), 0, 1, "ul");
  const word = toggleUnderline(list, { block: 0, offset: 0 }, { block: 0, offset: 5 });
  const items = word[0]?.kind === "ul" ? word[0].items : [];
  assert.equal(items[0]?.[0]?.text, "Герой");
  assert.equal(items[0]?.[0]?.underline, true);
  assert.equal(items[1]?.some((part) => part.underline), false);
  const grown = applyTextSize(list, { block: 0, offset: 0 }, { block: 0, offset: 0 }, "l");
  const grownItems = grown[0]?.kind === "ul" ? grown[0].items : [];
  assert.equal(grownItems[0]?.[0]?.size, "l");
  assert.equal(grownItems[1]?.some((part) => part.size), false);
});

test("в редакторе у списков есть маркеры", () => {
  const css = fs.readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.writing-prose ul \{[^}]*list-style: disc/);
  assert.match(css, /\.writing-prose ol \{[^}]*list-style: decimal/);
});

test("формат текста добавляется столбцом и ничего не удаляет", () => {
  assert.equal(findDestructive(sql).length, 0);
  assert.equal(sql.includes("DELETE"), false);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "contentFormat"/);
  assert.match(sql, /DEFAULT 'plain'/);
  const names = sortSqlNames([
    "2026-10-27-free-section-format.sql",
    "2026-10-26-9-daily-quote-order.sql",
    "2026-10-26-5-badges.sql",
  ]);
  assert.deepEqual(names.at(-1), "2026-10-27-free-section-format.sql");
});
