import assert from "node:assert/strict";
import test from "node:test";
import { MATERIAL_PAGE_SELECT, materialFilePath, materialRow, materialToRow } from "./materialFile";

test("список материалов не читает файлы", () => {
  const fields: Record<string, boolean> = MATERIAL_PAGE_SELECT;
  assert.equal("pdfUrl" in fields, false);
  assert.equal("epubUrl" in fields, false);
  assert.equal("fileUrl" in fields, false);
  assert.equal(fields.optional, true);
  assert.equal(fields.month, true);
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
  });
  assert.equal(row.pdfHref, null);
  assert.equal(row.fileHref, null);
});
