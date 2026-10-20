import { fillLetter, weeklyVolume, weeklyWhen, type LetterDraft } from "@/lib/letterTemplates";
import {
  templateDraft,
  type MentorTemplate,
  type QuoteLetterInput,
  type WeeklyLetterInput,
} from "@/lib/mentorCompose";

/** Ручная отправка. Без сохранённого шаблона текст тот же, что и раньше. {имя} остаётся для ученика. */
export function composeDraft(
  template: MentorTemplate,
  weekly: WeeklyLetterInput | null,
  quote: QuoteLetterInput | null,
  stored: LetterDraft | null,
): { subject: string; body: string; ready: boolean; reason?: string } {
  const base = templateDraft(template, weekly, quote);
  if (!stored || template === "blank" || !base.ready) return base;
  const vars: Record<string, string> =
    template === "weekly" && weekly
      ? {
          задание: weekly.title,
          текст: weekly.prompt,
          срок: weeklyWhen(weekly.publishedOn, weekly.nextPublishedOn),
          объём: weeklyVolume(weekly.lengthHint),
        }
      : template === "quote" && quote
        ? { цитата: quote.text, автор: quote.author, источник: quote.source ?? "" }
        : {};
  return {
    subject: fillLetter(stored.subject, vars),
    body: fillLetter(stored.body, vars),
    ready: true,
  };
}
