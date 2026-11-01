import assert from "node:assert/strict";
import test from "node:test";
import { examplePhotoUpdates, loadExamplePhotoManifest, pickExamplePhoto } from "./examplePhotos";
import { POP_ARC_SEED } from "./popArcs/seedData";
import { BELIEF_SEED } from "./belief/seedData";
import { STORY_CIRCLE_SEED } from "./storyCircle/seedData";
import fs from "node:fs";
import path from "node:path";

const manifest = loadExamplePhotoManifest(
  fs.readFileSync(path.join(process.cwd(), "public/example-photos/manifest.json"), "utf8"),
);

test("фото примера ищется по имени, а без имени — по порядку", () => {
  const entries = [
    { order: 0, name: "Тони", file: "a.png" },
    { order: 1, name: "Эльза", file: "b.png" },
  ];
  assert.equal(pickExamplePhoto(entries, { name: "Эльза", order: 0 }), "b.png");
  assert.equal(pickExamplePhoto(entries, { name: "Незнакомец", order: 0 }), "a.png");
  assert.equal(pickExamplePhoto(entries, { name: "Никто", order: 4 }), null);
});

test("пустое фото заполняется, уже стоящее и карточка без образца нет", () => {
  const rows = [
    { id: "empty", name: "Тони", order: 0, photoUrl: null },
    { id: "blank", name: "Эльза", order: 1, photoUrl: "  " },
    { id: "kept", name: "Тони", order: 0, photoUrl: "data:image/png;base64,abc" },
    { id: "none", name: "Марлин", order: 99, photoUrl: "" },
  ];
  const updates = examplePhotoUpdates(rows, manifest["pop-arc"], (file) => `data:${file}`);
  assert.deepEqual(
    updates.map((row) => row.id),
    ["empty", "blank"],
  );
  assert.equal(updates[0]?.photoUrl, "data:pop-arc/00.png");
});

test("у арок и веры есть фото, у круга только записанные в манифесте", () => {
  for (const [order, seed] of POP_ARC_SEED.entries()) {
    assert.ok(pickExamplePhoto(manifest["pop-arc"], { name: seed.name, order }));
  }
  for (const [order, seed] of BELIEF_SEED.entries()) {
    assert.ok(pickExamplePhoto(manifest.belief, { name: seed.hero, order }));
  }
  for (const [order, seed] of STORY_CIRCLE_SEED.entries()) {
    const listed = manifest["story-circle"].some((entry) => entry.name === seed.hero);
    assert.equal(Boolean(pickExamplePhoto(manifest["story-circle"], { name: seed.hero, order })), listed);
  }
  assert.equal(
    pickExamplePhoto(manifest["story-circle"], { name: "Марлин (В поисках Немо)", order: 2 }),
    null,
  );
});
