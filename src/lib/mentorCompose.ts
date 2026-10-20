import { EMAIL_SIGNATURE, appUrl, renderEmail } from "@/lib/mail";
import { dailyQuoteLetter, platformUpdateLetter, weeklyTaskLetter } from "@/lib/notify";

export const MENTOR_SEND_MAX = 40;
export const MENTOR_SEND_GAP_MS = 400;

export type MentorTemplate = "blank" | "platform" | "weekly" | "quote";

export type WeeklyLetterInput = {
  title: string;
  prompt: string;
  lengthHint: string;
  publishedOn: string;
  nextPublishedOn?: string | null;
};

export type QuoteLetterInput = {
  text: string;
  author: string;
  source?: string;
};

const PLACEHOLDER = "{имя}";

export function applyStudentName(value: string, name: string): string {
  return value.replaceAll(PLACEHOLDER, name.trim() || "ученик");
}

function norm(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function letterBody(text: string, title: string): string {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === title);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("Открыть ") || line.trim() === EMAIL_SIGNATURE);
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

export function templateDraft(
  template: MentorTemplate,
  weekly: WeeklyLetterInput | null,
  quote: QuoteLetterInput | null,
): { subject: string; body: string; ready: boolean; reason?: string } {
  if (template === "blank") return { subject: "", body: "", ready: true };
  if (template === "platform") {
    const letter = platformUpdateLetter({ name: PLACEHOLDER });
    return { subject: "Отчёт об обновлениях", body: letterBody(letter.text, "Отчёт об обновлениях"), ready: true };
  }
  if (template === "weekly") {
    if (!weekly?.title) {
      return { subject: "Задание недели", body: "", ready: false, reason: "Задания недели ещё нет." };
    }
    const letter = weeklyTaskLetter({ name: PLACEHOLDER, ...weekly });
    return { subject: "Задание недели", body: letterBody(letter.text, "Задание недели"), ready: true };
  }
  if (!quote?.text?.trim() || !quote.author?.trim()) {
    return { subject: "Цитата дня", body: "", ready: false, reason: "Цитаты на сегодня нет." };
  }
  const letter = dailyQuoteLetter({
    name: PLACEHOLDER,
    text: quote.text,
    author: quote.author,
    source: quote.source,
  });
  return { subject: "Цитата дня", body: letterBody(letter.text, "Цитата дня"), ready: true };
}

function usesDesign(
  template: MentorTemplate,
  body: string,
  weekly: WeeklyLetterInput | null,
  quote: QuoteLetterInput | null,
): boolean {
  if (template === "blank") return false;
  const draft = templateDraft(template, weekly, quote);
  return draft.ready && norm(body) === norm(draft.body);
}

export function renderMentorCompose(input: {
  template: MentorTemplate;
  subject: string;
  body: string;
  name: string;
  weekly: WeeklyLetterInput | null;
  quote: QuoteLetterInput | null;
}): { subject: string; html: string; text: string; type: string } {
  const subject = applyStudentName(input.subject, input.name).trim() || "Письмо";
  const name = input.name.trim() || "ученик";
  if (usesDesign(input.template, input.body, input.weekly, input.quote)) {
    if (input.template === "platform") {
      const letter = platformUpdateLetter({ name });
      return { subject, html: letter.html, text: letter.text, type: "platform-update" };
    }
    if (input.template === "weekly" && input.weekly) {
      const letter = weeklyTaskLetter({ name, ...input.weekly });
      return { subject, html: letter.html, text: letter.text, type: "weekly-task" };
    }
    if (input.template === "quote" && input.quote) {
      const letter = dailyQuoteLetter({
        name,
        text: input.quote.text,
        author: input.quote.author,
        source: input.quote.source,
      });
      return { subject, html: letter.html, text: letter.text, type: "daily-quote" };
    }
  }
  const action =
    input.template === "weekly"
      ? { label: "Открыть задание", url: `${appUrl()}/dashboard/weekly` }
      : input.template === "blank"
        ? undefined
        : { label: "Открыть кабинет", url: `${appUrl()}/dashboard/tasks` };
  const parts = applyStudentName(input.body, name)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const letter = renderEmail({
    title: subject,
    blocks: (parts.length ? parts : [""]).map((text) => ({ kind: "p" as const, text })),
    action,
    signature: EMAIL_SIGNATURE,
  });
  const type =
    input.template === "platform"
      ? "platform-update"
      : input.template === "weekly"
        ? "weekly-task"
        : input.template === "quote"
          ? "daily-quote"
          : "mentor-letter";
  return { subject, html: letter.html, text: letter.text, type };
}

/** По одному, с паузой. Параллельной пачки нет: так почтовый сервер реже блокирует ящик. */
export async function sendInSeries<T>(
  items: T[],
  gapMs: number,
  run: (item: T, index: number) => Promise<void>,
): Promise<void> {
  for (let index = 0; index < items.length; index += 1) {
    if (index > 0 && gapMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, gapMs));
    }
    await run(items[index], index);
  }
}
