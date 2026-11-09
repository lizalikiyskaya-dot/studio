/** Подписи в панели заметок. Включается только у наставника и только явно. */
export function mentorLabelsFromEnv(
  role: "MENTOR" | "STUDENT",
  value = process.env.NOTES_MENTOR_LABELS,
): boolean {
  return role === "MENTOR" && value === "on";
}

/** Без цитаты — общий стикер. С цитатой — комментарий к фразе. */
export function mentorNoteLabel(anchorQuote: string): "Общий стикер" | "Комментарий к фразе" {
  return anchorQuote.trim() ? "Комментарий к фразе" : "Общий стикер";
}
