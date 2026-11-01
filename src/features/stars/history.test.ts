import assert from "node:assert/strict";
import test from "node:test";
import { starAwardReason, starHistoryDate } from "./history";

test("подпись берёт заметку журнала, если она есть", () => {
  assert.equal(
    starAwardReason({ kind: "MAIN_TASK", sourceId: "book-complete", note: "завершение книги" }),
    "завершение книги",
  );
});

test("пустая заметка раскрывается по виду начисления", () => {
  assert.equal(starAwardReason({ kind: "WEEKLY", sourceId: "w1", note: "  " }), "задание недели");
  assert.equal(starAwardReason({ kind: "MAIN_TASK", sourceId: "t1", note: "" }), "основное задание");
  assert.equal(starAwardReason({ kind: "CONTEST", sourceId: "c1", note: "" }), "отправка на конкурс");
  assert.equal(starAwardReason({ kind: "PUBLISHER", sourceId: "p1", note: "" }), "отправка в издательство");
  assert.equal(starAwardReason({ kind: "CHAPTER", sourceId: "ch1", note: "" }), "принятая глава");
  assert.equal(starAwardReason({ kind: "GUIDE", sourceId: "g1", note: "" }), "покупка методички");
  assert.equal(starAwardReason({ kind: "STREAK", sourceId: "4", note: "" }), "серия 4 недели");
  assert.equal(starAwardReason({ kind: "STREAK", sourceId: "8", note: "" }), "серия 8 недель");
  assert.equal(starAwardReason({ kind: "STREAK", sourceId: "12", note: "" }), "серия 12 недель");
  assert.equal(starAwardReason({ kind: "STREAK", sourceId: "", note: "" }), "серия");
});

test("дата истории по Москве", () => {
  assert.equal(starHistoryDate("2026-10-25T21:30:00.000Z"), "26 октября 2026");
  assert.equal(starHistoryDate("не дата"), "");
});

test("в подписях нет длинного тире", () => {
  const reasons = ["WEEKLY", "MAIN_TASK", "CONTEST", "PUBLISHER", "CHAPTER", "STREAK", "GUIDE"].map((kind) =>
    starAwardReason({ kind, sourceId: "4", note: "" }),
  );
  for (const reason of reasons) assert.equal(reason.includes("—"), false);
});
