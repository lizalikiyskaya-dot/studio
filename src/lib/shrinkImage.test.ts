import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { shrinkImage } from "./shrinkImage";

test("a large jpeg is scaled down and stays a jpeg", async () => {
  const raw = Buffer.alloc(2000 * 1400 * 3);
  for (let i = 0; i < raw.length; i += 3) {
    raw[i] = i % 251;
    raw[i + 1] = (i * 3) % 251;
    raw[i + 2] = (i * 7) % 251;
  }
  const big = await sharp(raw, { raw: { width: 2000, height: 1400, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
  const out = await shrinkImage(big, "image/jpeg", 800);
  assert.equal(out.mime, "image/jpeg");
  assert.ok(out.buf.length < big.length, `expected smaller file, got ${out.buf.length} >= ${big.length}`);
  const meta = await sharp(out.buf).metadata();
  assert.ok((meta.width ?? 0) <= 800);
  assert.ok((meta.height ?? 0) <= 800);
  assert.equal(out.buf[0], 0xff);
  assert.equal(out.buf[1], 0xd8);
});

test("gif bytes are returned unchanged", async () => {
  const gif = Buffer.from("GIF89a-not-a-real-gif");
  const out = await shrinkImage(gif, "image/gif", 200);
  assert.equal(out.mime, "image/gif");
  assert.equal(out.buf.compare(gif), 0);
});
