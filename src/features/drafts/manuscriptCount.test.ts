import assert from "node:assert/strict";
import test from "node:test";
import { countSigns } from "./manuscriptCount";

test("знаки считают текст, а не звёздочки разметки", () => {
  assert.equal(countSigns("Северная река.", "plain"), "Северная река.".length);
  assert.equal(countSigns("Герой **вышел** на крыльцо.", "markdown"), "Герой вышел на крыльцо.".length);
  assert.equal(countSigns("", "plain"), 0);
});
