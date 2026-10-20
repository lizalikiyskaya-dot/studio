import assert from "node:assert/strict";
import test from "node:test";
import { blocksNote } from "./SelectionAnnotator";

test("поле ввода не поднимает заметку", () => {
  assert.equal(blocksNote({ tagName: "TEXTAREA" }), true);
  assert.equal(blocksNote({ tagName: "INPUT", type: "text" }), true);
  assert.equal(blocksNote({ tagName: "INPUT", type: "search" }), true);
  assert.equal(blocksNote({ tagName: "SELECT" }), true);
  assert.equal(blocksNote({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(blocksNote({ tagName: "DIV", getAttribute: (name) => (name === "role" ? "textbox" : null) }), true);
  assert.equal(
    blocksNote({ tagName: "SPAN", parentElement: { tagName: "TEXTAREA" } }),
    true
  );
});

test("обычный текст и чужие контролы заметку не блокируют", () => {
  assert.equal(blocksNote({ tagName: "P", parentElement: { tagName: "DIV" } }), false);
  assert.equal(blocksNote({ tagName: "INPUT", type: "checkbox" }), false);
  assert.equal(blocksNote({ tagName: "BUTTON" }), false);
  assert.equal(blocksNote(null), false);
});

test("режим правок не поднимает заметку", () => {
  assert.equal(
    blocksNote({
      tagName: "SPAN",
      parentElement: { tagName: "DIV", getAttribute: (name) => (name === "data-review-field" ? "" : null) },
    }),
    true,
  );
});

test("панель заметок не аннотирует сама себя", () => {
  assert.equal(blocksNote({ tagName: "DIV", dataset: { notesUi: "1" } }), true);
  assert.equal(blocksNote({ tagName: "BUTTON", dataset: { annotateBtn: "" } }), true);
});
