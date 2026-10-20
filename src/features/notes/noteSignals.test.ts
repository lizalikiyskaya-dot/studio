import assert from "node:assert/strict";
import test from "node:test";
import { activityItems, fromOther, incomingChimes, openNoteCount, unreadIds } from "./noteSignals";

test("счётчик шапки считает только открытые", () => {
  assert.equal(openNoteCount([{ resolved: false }, { resolved: true }, { resolved: false }]), 2);
  assert.equal(openNoteCount([{ resolved: true }]), 0);
});

test("чужие заметки и комментарии отличаются от своих", () => {
  assert.equal(fromOther("STUDENT", "MENTOR"), true);
  assert.equal(fromOther("STUDENT", "Наставник"), true);
  assert.equal(fromOther("STUDENT", "STUDENT"), false);
  assert.equal(fromOther("STUDENT", "Ученик"), false);
  assert.equal(fromOther("MENTOR", "Ученик"), true);
  assert.equal(fromOther("MENTOR", "Наставник"), false);
});

test("звук только на новое чужое и не на уже известное", () => {
  const known = new Set(["note-1"]);
  const first = incomingChimes(known, [
    { id: "note-1", author: "MENTOR" },
    { id: "note-2", author: "MENTOR" },
    { id: "note-3", author: "STUDENT" },
  ], "STUDENT");
  assert.deepEqual(first.play, ["note-2"]);
  const again = incomingChimes(first.next, [
    { id: "note-1", author: "MENTOR" },
    { id: "note-2", author: "MENTOR" },
    { id: "note-3", author: "STUDENT" },
  ], "STUDENT");
  assert.deepEqual(again.play, []);
});

test("непрочитанные — чужие, которых ещё не открывали", () => {
  const items = activityItems(
    [{ id: "n1", authorRole: "MENTOR" }, { id: "n2", authorRole: "STUDENT" }],
    { n1: [{ id: "c1", author: "Наставник" }, { id: "c2", author: "Ученик" }] },
  );
  assert.deepEqual(unreadIds(new Set(["n1"]), items, "STUDENT"), ["c1"]);
});
