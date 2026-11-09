import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../../..");

test("развёрнутая сдача листается, а закрытие возвращает прокрутку страницы", () => {
  const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
  const focus = fs.readFileSync(path.join(root, "src/features/drafts/ManuscriptFocus.tsx"), "utf8");
  const preview = fs.readFileSync(path.join(root, "src/features/weekly/WeeklyAnswer.tsx"), "utf8");

  function block(source: string, selector: string) {
    const start = source.indexOf(selector);
    assert.notEqual(start, -1, selector);
    const open = source.indexOf("{", start);
    const close = source.indexOf("}", open);
    return source.slice(open + 1, close);
  }

  const overlay = block(css, ".manuscript.manuscript-focus {");
  assert.match(overlay, /overflow:\s*hidden/);
  assert.match(overlay, /height:\s*100dvh/);
  const editor = block(css, ".manuscript.manuscript-focus .writing-editor:not(:has(.writing-toolbar)) {");
  assert.match(editor, /overflow-y:\s*auto/);
  assert.match(editor, /overscroll-behavior:\s*contain/);
  assert.match(editor, /touch-action:\s*pan-y/);

  assert.match(preview, /readOnly/);
  assert.match(preview, /layout="screen"/);
  assert.match(focus, /document\.body\.style\.overflow = previous/);
  assert.match(focus, /window\.scrollTo\(0, scrollY\)/);
  assert.match(focus, /const scrollY = window\.scrollY/);
});
