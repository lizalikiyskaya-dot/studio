import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@/lib/prisma";
import { guideFieldData } from "./fields";

test("частичная правка методички не тащит чужие поля", () => {
  assert.deepEqual(Object.keys(guideFieldData({ title: "Название" })), ["title"]);
  assert.deepEqual(Object.keys(guideFieldData({ description: "" })), ["description"]);
  assert.deepEqual(Object.keys(guideFieldData({ order: 2 })), ["order"]);
  assert.deepEqual(Object.keys(guideFieldData({ notifyOnOpen: false })), ["notifyOnOpen"]);
  assert.deepEqual(
    Object.keys(guideFieldData({ fileUrl: "data:", fileName: "a.pdf", fileMime: "application/pdf" })).sort(),
    ["fileMime", "fileName", "fileUrl"]
  );
  assert.equal(guideFieldData({ description: "" }).notifyOnOpen, undefined);
  assert.equal(guideFieldData({ title: "Название" }).notifyOnOpen, undefined);
  assert.throws(() => guideFieldData({ description: "", notifyOnOpen: true } as never));
});

test("сохранение названия, описания и файла не переключает письмо", async () => {
  const guide = await prisma.guide.create({
    data: { title: "Было", description: "короткий текст", notifyOnOpen: false, order: 900 },
  });
  try {
    await prisma.guide.update({
      where: { id: guide.id },
      data: guideFieldData({ description: "" }),
    });
    await prisma.guide.update({
      where: { id: guide.id },
      data: guideFieldData({ title: "Стало" }),
    });
    await prisma.guide.update({
      where: { id: guide.id },
      data: guideFieldData({ fileUrl: "data:text/plain;base64,YQ==", fileName: "a.txt", fileMime: "text/plain" }),
    });
    await prisma.guide.update({
      where: { id: guide.id },
      data: guideFieldData({ order: 901 }),
    });

    const cleared = await prisma.guide.findUniqueOrThrow({ where: { id: guide.id } });
    assert.equal(cleared.notifyOnOpen, false);
    assert.equal(cleared.description, "");
    assert.equal(cleared.title, "Стало");
    assert.equal(cleared.fileName, "a.txt");

    await prisma.guide.update({
      where: { id: guide.id },
      data: guideFieldData({ notifyOnOpen: true }),
    });
    await prisma.guide.update({
      where: { id: guide.id },
      data: guideFieldData({ description: "снова текст" }),
    });
    await prisma.guide.update({
      where: { id: guide.id },
      data: guideFieldData({ title: "Ещё раз" }),
    });

    const kept = await prisma.guide.findUniqueOrThrow({ where: { id: guide.id } });
    assert.equal(kept.notifyOnOpen, true);
    assert.equal(kept.description, "снова текст");
    assert.equal(kept.title, "Ещё раз");
  } finally {
    await prisma.guide.delete({ where: { id: guide.id } }).catch(() => {});
  }
});
