import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export type ExamplePhotoKind = "pop-arc" | "belief" | "story-circle";

export type ExamplePhotoEntry = {
  order: number;
  name: string;
  file: string;
};

export type ExamplePhotoManifest = Record<ExamplePhotoKind, ExamplePhotoEntry[]>;

export type ExamplePhotoRow = {
  id: string;
  name: string;
  order: number;
  photoUrl: string | null;
};

const ROOT = path.join(process.cwd(), "public", "example-photos");
const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

let manifestCache: ExamplePhotoManifest | null = null;
const dataUrlCache = new Map<string, string | null>();

export function loadExamplePhotoManifest(raw: string): ExamplePhotoManifest {
  const parsed = JSON.parse(raw) as Partial<ExamplePhotoManifest>;
  return {
    "pop-arc": parsed["pop-arc"] ?? [],
    belief: parsed.belief ?? [],
    "story-circle": parsed["story-circle"] ?? [],
  };
}

function manifest(): ExamplePhotoManifest {
  if (manifestCache) return manifestCache;
  const file = path.join(ROOT, "manifest.json");
  manifestCache = loadExamplePhotoManifest(fs.readFileSync(file, "utf8"));
  return manifestCache;
}

/** Имя примера важнее порядка: переставленная карточка сохраняет своё лицо. */
export function pickExamplePhoto(entries: ExamplePhotoEntry[], row: { name: string; order: number }): string | null {
  const name = row.name.trim();
  const byName = name ? entries.find((entry) => entry.file && entry.name.trim() === name) : undefined;
  if (byName) return byName.file;
  return entries.find((entry) => entry.file && entry.order === row.order)?.file ?? null;
}

export function examplePhotoUpdates(
  rows: ExamplePhotoRow[],
  entries: ExamplePhotoEntry[],
  dataUrlFor: (file: string) => string | null,
): { id: string; photoUrl: string }[] {
  const updates: { id: string; photoUrl: string }[] = [];
  for (const row of rows) {
    if (row.photoUrl?.trim()) continue;
    const file = pickExamplePhoto(entries, row);
    if (!file) continue;
    const photoUrl = dataUrlFor(file);
    if (!photoUrl) continue;
    updates.push({ id: row.id, photoUrl });
  }
  return updates;
}

function photoFile(relative: string): string | null {
  const root = path.resolve(ROOT);
  const full = path.resolve(root, relative);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

export function examplePhotoDataUrl(relative: string): string | null {
  if (dataUrlCache.has(relative)) return dataUrlCache.get(relative) ?? null;
  const full = photoFile(relative);
  const ext = full ? path.extname(full).toLowerCase() : "";
  const mime = MIME[ext];
  let url: string | null = null;
  if (full && mime && fs.existsSync(full)) {
    const bytes = fs.readFileSync(full);
    if (bytes.length > 0) url = `data:${mime};base64,${bytes.toString("base64")}`;
  }
  dataUrlCache.set(relative, url);
  return url;
}

export function seededExamplePhoto(kind: ExamplePhotoKind, name: string, order: number): string | null {
  const file = pickExamplePhoto(manifest()[kind], { name, order });
  return file ? examplePhotoDataUrl(file) : null;
}

/** Пустое фото примера заполняется. Чужое и уже стоящее фото не трогаем. */
export async function fillEmptyExamplePhotos(kind: ExamplePhotoKind, rows: ExamplePhotoRow[]) {
  const updates = examplePhotoUpdates(rows, manifest()[kind], examplePhotoDataUrl);
  for (const update of updates) {
    const where = { id: update.id, isExample: true, OR: [{ photoUrl: null }, { photoUrl: "" }] };
    const data = { photoUrl: update.photoUrl };
    if (kind === "pop-arc") await prisma.popArcCharacter.updateMany({ where, data });
    else if (kind === "belief") await prisma.beliefCard.updateMany({ where, data });
    else await prisma.storyCircleCard.updateMany({ where, data });
  }
}
