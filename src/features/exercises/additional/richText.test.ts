import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { findDestructive, sortSqlNames } from "../../../../scripts/sql-guard.mjs";
import {
  loadBlocks,
  markdownToBlocks,
  plainToBlocks,
  readBlocks,
  saveBlocks,
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
  parentNode: MiniElement | null = null;
  childNodes: Array<MiniElement | MiniText> = [];
  constructor(tag: string) {
    this.nodeName = tag.toUpperCase();
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
