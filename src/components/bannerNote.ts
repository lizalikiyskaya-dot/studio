/** Длина, после которой примечание в баннере «Опен-колл недели» считается длинным. */
export const BANNER_NOTE_PREVIEW_CHARS = 160;

/** Сколько строк превью остаётся, пока примечание свёрнуто. */
export const BANNER_NOTE_PREVIEW_LINES = 3;

export function bannerNoteIsLong(note: string): boolean {
  const text = note.trim();
  if (!text) return false;
  if (text.length > BANNER_NOTE_PREVIEW_CHARS) return true;
  return text.split(/\r?\n/).length > BANNER_NOTE_PREVIEW_LINES;
}
