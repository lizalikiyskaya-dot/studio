import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOK_NOTE_MAX,
  MATERIAL_PAGE_SELECT,
  materialFilePath,
  materialRow,
  materialToRow,
  storedBookNote,
  visibleBookMonth,
  visibleBookNote,
} from "./materialFile";

test("список материалов не читает файлы", () => {
  const fields: Record<string, boolean> = MATERIAL_PAGE_SELECT;
  assert.equal("pdfUrl" in fields, false);
  assert.equal("epubUrl" in fields, false);
  assert.equal("fileUrl" in fields, false);
  assert.equal(fields.optional, true);
  assert.equal(fields.month, true);
  assert.equal(fields.note, true);
  assert.equal(fields.title, true);
});

test("файл в списке — ссылка, даже если размер не посчитался", () => {
  const row = materialRow(
    {
      id: "m 1",
      studentId: "s",
      order: 0,
      category: "BOOK",
      title: "Аура",
      status: "UNREAD",
      pdfName: "aura.pdf",
      epubName: null,
      fileName: "note.docx",
      optional: true,
      month: "ноябрь 2026",
      note: "не целиком",
    },
    { pdf: true, epub: false, file: true },
    { pdf: 1200, epub: null, file: null },
  );
  assert.equal(row.pdfHref, materialFilePath("m 1", "pdf"));
  assert.equal(row.pdfHref, "/api/materials/m%201/file?kind=pdf");
  assert.equal(row.epubHref, null);
  assert.equal(row.fileHref, "/api/materials/m%201/file?kind=file");
  assert.equal(row.pdfBytes, 1200);
  assert.equal(row.fileBytes, null);
  assert.equal(row.optional, true);
  assert.equal(row.month, "ноябрь 2026");
  assert.equal(row.note, "не целиком");
});

test("новая строка не тащит содержимое файла", () => {
  const row = materialToRow({
    id: "new",
    studentId: "s",
    order: 1,
    category: "HANDOUT",
    title: "Новая методичка",
    status: "UNREAD",
    pdfName: null,
    epubName: null,
    fileName: null,
    optional: false,
    month: null,
    note: null,
  });
  assert.equal(row.pdfHref, null);
  assert.equal(row.fileHref, null);
  assert.equal(row.note, null);
});

test("пустой месяц не даёт плашку, заметка обрезается и пустая становится null", () => {
  assert.equal(visibleBookMonth(null), null);
  assert.equal(visibleBookMonth(""), null);
  assert.equal(visibleBookMonth("   "), null);
  assert.equal(visibleBookMonth(" март 2027 "), "март 2027");
  assert.equal(visibleBookNote(null), null);
  assert.equal(visibleBookNote("  "), null);
  assert.equal(visibleBookNote(" не целиком "), "не целиком");
  assert.equal(storedBookNote("   "), null);
  assert.equal(storedBookNote("  как словарём  "), "как словарём");
  assert.equal(storedBookNote("я".repeat(BOOK_NOTE_MAX + 20))?.length, BOOK_NOTE_MAX);
});
