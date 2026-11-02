import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { DocxError, googleDocExportUrl, splitDocx, splitDocumentXml } from "./docxSplit";

const XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Предисловие реки.</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Туман</w:t></w:r></w:p>
    <w:p><w:r><w:t>Северная река молчит.</w:t></w:r></w:p>
    <w:p><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:r><w:t>Письма</w:t></w:r></w:p>
    <w:p><w:r><w:t>Он &amp; она.</w:t></w:r><w:r><w:del><w:t> скрыто</w:t></w:del></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Заголовок 1"/></w:pPr><w:r><w:t>Финал</w:t></w:r></w:p>
  </w:body>
</w:document>`;

test("заголовок 1 отделяет главы, заголовок 2 остаётся внутри", () => {
  const split = splitDocx(zip({ "word/document.xml": XML }, 8), 1);
  assert.deepEqual(
    split.pieces.map((piece) => ({ title: piece.title, level: piece.level, checked: piece.checked, text: piece.text })),
    [
      { title: "До первой главы", level: 0, checked: false, text: "Предисловие реки." },
      {
        title: "Туман",
        level: 1,
        checked: true,
        text: "Северная река молчит.\n\nПисьма\nОн & она.",
      },
      { title: "Финал", level: 1, checked: true, text: "" },
    ],
  );
  assert.equal(split.pieces[1].chars, "Северная река молчит.\n\nПисьма\nОн & она.".length);
  assert.match(split.note ?? "", /не отмечен/);
});

test("уровень 2 выносит вложенный заголовок в свою главу", () => {
  const split = splitDocumentXml(XML, 2);
  assert.deepEqual(
    split.pieces.map((piece) => piece.title),
    ["До первой главы", "Туман", "Письма", "Финал"],
  );
  assert.equal(split.pieces[2].text, "Он & она.");
  assert.equal(split.pieces[2].chars, "Он & она.".length);
});

test("стиль «1» и документ без заголовков", () => {
  const headed = splitDocumentXml(
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:pPr><w:pStyle w:val="1"/></w:pPr><w:r><w:t>Крыльцо</w:t></w:r></w:p>
      <w:p><w:r><w:t>Тихий двор.</w:t></w:r></w:p>
    </w:body></w:document>`,
    1,
  );
  assert.equal(headed.pieces.length, 1);
  assert.equal(headed.pieces[0].title, "Крыльцо");
  assert.equal(headed.pieces[0].text, "Тихий двор.");
  assert.equal(headed.pieces[0].checked, true);

  const plain = splitDocumentXml(
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      <w:p><w:r><w:t>Одна глава без шапки.</w:t></w:r></w:p>
    </w:body></w:document>`,
    1,
  );
  assert.equal(plain.pieces[0].title, "Одна глава без шапки.");
  assert.equal(plain.pieces[0].checked, true);
  assert.match(plain.note ?? "", /нет/);
});

test("пустой и посторонний файл не считаются документом", () => {
  assert.throws(() => splitDocx(new Uint8Array([1, 2, 3, 4]), 1), (error: unknown) => error instanceof DocxError && error.code === "not-docx");
  assert.throws(
    () => splitDocx(zip({ "word/other.xml": "<w:document/>" }, 0), 1),
    (error: unknown) => error instanceof DocxError && error.code === "not-docx",
  );
  assert.throws(
    () => splitDocumentXml(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body></w:body></w:document>`, 1),
    (error: unknown) => error instanceof DocxError && error.code === "empty",
  );
});

test("ссылка на Google Документ становится адресом экспорта", () => {
  const id = "1AbC-def_GHIjklMNOP";
  const expected = `https://docs.google.com/document/d/${id}/export?format=docx`;
  assert.equal(googleDocExportUrl(`https://docs.google.com/document/d/${id}/edit?usp=sharing`), expected);
  assert.equal(googleDocExportUrl(`https://docs.google.com/document/u/0/d/${id}/edit`), expected);
  assert.equal(googleDocExportUrl(`https://docs.google.com/spreadsheets/d/${id}/edit`), null);
  assert.equal(googleDocExportUrl(`http://docs.google.com/document/d/${id}/edit`), null);
  assert.equal(googleDocExportUrl(`https://docs.google.com.evil.com/document/d/${id}/edit`), null);
  assert.equal(googleDocExportUrl(`https://evil.com/document/d/${id}/edit`), null);
});

function zip(files: Record<string, string>, method: 0 | 8) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const raw = Buffer.from(content);
    const compressed = method === 0 ? raw : deflateRawSync(raw);
    const nameBytes = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const localBytes = Buffer.concat([local, nameBytes, compressed]);
    locals.push(localBytes);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, nameBytes]));
    offset += localBytes.length;
  }
  const directory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, eocd]));
}
