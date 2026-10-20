import assert from "node:assert/strict";
import test from "node:test";
import { blocksNote, fieldQuote, isTextField } from "./SelectionAnnotator";

test("поле ввода не блокирует заметку", () => {
  assert.equal(blocksNote({ tagName: "TEXTAREA" }), false);
  assert.equal(blocksNote({ tagName: "INPUT", type: "text" }), false);
  assert.equal(isTextField({ tagName: "TEXTAREA" }), true);
  assert.equal(isTextField({ tagName: "INPUT", type: "text" }), true);
  assert.equal(isTextField({ tagName: "INPUT", type: "checkbox" }), false);
  assert.equal(fieldQuote("Северный город у реки", 0, 8), "Северный");
  assert.equal(fieldQuote("аб", 0, 1), null);
  assert.equal(fieldQuote("аб", 2, 2), null);
});

test("обычный текст заметку не блокирует", () => {
  assert.equal(blocksNote({ tagName: "P", parentElement: { tagName: "DIV" } }), false);
  assert.equal(blocksNote({ tagName: "BUTTON" }), false);
  assert.equal(blocksNote(null), false);
});

test("режим правок не поднимает заметку", () => {
  const field = {
    tagName: "TEXTAREA",
    parentElement: { tagName: "DIV", getAttribute: (name: string) => (name === "data-review-field" ? "" : null) },
  };
  assert.equal(blocksNote(field), true);
  assert.equal(isTextField(field), false);
});

test("панель заметок не аннотирует сама себя", () => {
  assert.equal(blocksNote({ tagName: "DIV", dataset: { notesUi: "1" } }), true);
  assert.equal(blocksNote({ tagName: "BUTTON", dataset: { annotateBtn: "" } }), true);
});
