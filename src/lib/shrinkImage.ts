import sharp from "sharp";

/**
 * Ужимает картинку перед записью в базу.
 *
 * Загрузки лежат в Postgres как data: URI. Страница кабинета читает эти
 * строки целиком, поэтому фото 4 МБ приезжает в браузер вместе с текстом.
 * Здесь длинная сторона ограничивается, а файл перекодируется только если
 * результат меньше исходника. GIF не трогаем: кадры анимации нельзя склеить
 * в один JPEG незаметно.
 */
export async function shrinkImage(
  buf: Buffer,
  mime: string,
  maxEdge: number
): Promise<{ buf: Buffer; mime: string }> {
  if (mime === "image/gif") return { buf, mime };
  try {
    const meta = await sharp(buf, { failOn: "none" }).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    let pipeline = sharp(buf, { failOn: "none" }).rotate();
    if (width > maxEdge || height > maxEdge) {
      pipeline = pipeline.resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    const next =
      mime === "image/png"
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : mime === "image/webp"
          ? await pipeline.webp({ quality: 80 }).toBuffer()
          : await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    const nextMime = mime === "image/png" || mime === "image/webp" ? mime : "image/jpeg";
    if (next.length >= buf.length) return { buf, mime };
    return { buf: next, mime: nextMime };
  } catch (error) {
    console.error("[shrinkImage] оставляю исходный файл:", error);
    return { buf, mime };
  }
}
