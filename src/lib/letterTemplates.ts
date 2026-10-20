import { EMAIL_SIGNATURE, appUrl, escapeHtml, renderEmail } from "@/lib/mail";
import { optOutLinkLabel } from "@/lib/mailOptOut";
import type { OptOutKind } from "@/lib/mailOptOut";

/** Тема и текст шаблона. Пусто в базе: письмо собирается как раньше. */
export const LETTER_KEYS = [
  "platform",
  "weekly-task",
  "daily-quote",
  "payment",
  "guide",
  "registration",
  "registration-mentor",
  "approved",
  "password",
  "mentor-edit",
  "student-edit",
  "student-online",
] as const;

export type LetterKey = (typeof LETTER_KEYS)[number];

export type LetterDraft = { subject: string; body: string };

export type LetterOutput = { subject: string; html: string; text: string };

type LetterSpec = {
  title: string;
  subject: string;
  body: string;
  placeholders: string[];
};

const SPECS: Record<LetterKey, LetterSpec> = {
  platform: {
    title: "Отчёт об обновлениях",
    subject: "Отчёт об обновлениях",
    body: [
      "{имя}, коротко о том, что изменилось в кабинете, и куда нажать.",
      "Задания\nПоле больше не съезжает в сторону, когда вы правите текст.\nМою правку можно принять или отклонить по куску. Кнопки стоят у этого куска.\nКуда нажать: левое меню, пункт «Задания».",
      "План работы\nФильтры те же, что у заданий: «В процессе», «Запланировано», «Все задачи».\nСрок берётся из самого задания. Месяц показан списком.\nКуда нажать: левое меню, пункт «План работы».",
      "Книга\nСчётчик «2 из 3» пишется, только если книг или циклов несколько.\nКуда нажать: карточка книги в левом меню.",
      "Сеттинг\nФото слева сверху. Справа виджет «Тип сеттинга»: квадрат и «Итог».\nКарточки «Библии мира» открываются на месте.\nЖёлтый стикер: коротко о мире, список пунктов и заметка к каждой теме.\nКуда нажать: левое меню, пункт «Сеттинг».",
      "Заметки\nЕсли выделить текст внутри поля, кнопка «Заметка» не появляется. Стирание и набор работают как обычно.\nЗаметку по-прежнему можно поставить на обычный текст страницы.\nКуда нажать: выделите текст страницы вне поля.",
      "Материалы\nУ методички есть кнопка «Скачать».\nКуда нажать: левое меню, пункт «Материалы».",
      "Еженедельное задание\nЭто короткое необязательное задание на одну неделю.\nОно не связано с основными заданиями.\nТекст сдаёте на той же странице. За сдачу начисляются 2 звёздочки.\nКуда нажать: левое меню, пункт «Задание недели».",
      "Цитата дня\nЭто одна цитата писателя о ремесле.\nДень считается по Москве, поэтому у всех в эти сутки одна и та же цитата.\nОтдельной страницы нет.",
      "Если пункт не находится, напишите мне.",
    ].join("\n\n"),
    placeholders: ["имя"],
  },
  "weekly-task": {
    title: "Задание недели",
    subject: "Задание недели",
    body: "{имя}, на этой неделе такое задание.\n\n{задание}\n\n{текст}\n\n{срок}\n{объём}",
    placeholders: ["имя", "задание", "текст", "срок", "объём"],
  },
  "daily-quote": {
    title: "Цитата дня",
    subject: "Цитата дня",
    body: "{имя}, сегодня такая цитата.\n\n«{цитата}»\n{автор}\n{источник}",
    placeholders: ["имя", "цитата", "автор", "источник"],
  },
  payment: {
    title: "День оплаты",
    subject: "Сегодня день оплаты",
    body: "{имя}, сегодня {дата} — день оплаты.\n\n{сумма}\n\nЕсли дата или сумма изменились, напишите мне в Телеграме.",
    placeholders: ["имя", "дата", "сумма"],
  },
  guide: {
    title: "Методичка",
    subject: "Новая методичка: {название}",
    body: "{имя}, я открыла вам методичку «{название}».\n\n{описание}\n\nОна в разделе «Материалы». Файл можно скачать там.",
    placeholders: ["имя", "название", "описание"],
  },
  registration: {
    title: "Заявка ученику",
    subject: "Заявка на рассмотрении",
    body: "{имя}, я получила вашу заявку.\n\nПосмотрю её и открою кабинет. Когда открою, напишу ещё раз.",
    placeholders: ["имя"],
  },
  "registration-mentor": {
    title: "Заявка наставнику",
    subject: "Новая заявка на доступ",
    body: "Новая регистрация на платформе: {имя} ({почта}), {когда}.\n\nЗаявка ждёт решения в разделе модерации.",
    placeholders: ["имя", "почта", "когда"],
  },
  approved: {
    title: "Доступ открыт",
    subject: "Доступ в личный кабинет открыт",
    body: "{имя}, я открыла вам кабинет.\n\nВходите той же почтой и паролем, что указали при регистрации.",
    placeholders: ["имя"],
  },
  password: {
    title: "Восстановление пароля",
    subject: "Восстановление пароля",
    body: "{имя}, вы попросили сменить пароль.\n\nСсылка действует один час и сработает только один раз.",
    placeholders: ["имя"],
  },
  "mentor-edit": {
    title: "Наставник внёс правку",
    subject: "Наставник внёс правку",
    body: "{имя}, я внесла правки в ваш кабинет.\n\n{правки}",
    placeholders: ["имя", "правки"],
  },
  "student-edit": {
    title: "Ученик внёс правку",
    subject: "{имя}: новые правки в кабинете",
    body: "{имя}: в кабинете есть новые правки.\n\n{правки}",
    placeholders: ["имя", "правки"],
  },
  "student-online": {
    title: "Ученик онлайн",
    subject: "{имя} в кабинете",
    body: "{имя} в кабинете.\n\n{когда}",
    placeholders: ["имя", "когда"],
  },
};

export function isLetterKey(value: string): value is LetterKey {
  return (LETTER_KEYS as readonly string[]).includes(value);
}

export function letterSpec(key: LetterKey): LetterSpec {
  return SPECS[key];
}

export function standardDraft(key: LetterKey): LetterDraft {
  const spec = SPECS[key];
  return { subject: spec.subject, body: spec.body };
}

export function letterStorageKey(key: LetterKey): string {
  return `letter:${key}`;
}

function norm(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function sameAsStandard(key: LetterKey, draft: LetterDraft): boolean {
  const standard = standardDraft(key);
  return norm(draft.subject) === norm(standard.subject) && norm(draft.body) === norm(standard.body);
}

export function cleanDraft(draft: LetterDraft): { value?: LetterDraft; error?: string } {
  const subject = draft.subject.replace(/\r\n/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  const body = draft.body.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (!subject) return { error: "Нужна тема." };
  if (subject.length > 180) return { error: "Тема длиннее 180 знаков." };
  if (!body) return { error: "Нужен текст." };
  if (body.length > 8000) return { error: "Текст длиннее 8000 знаков." };
  return { value: { subject, body } };
}

export function fillLetter(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^{}]+)\}/g, (token, name: string) => {
    const value = vars[name];
    return value == null ? token : value;
  });
}

function paragraphs(body: string): { kind: "p"; text: string }[] {
  const parts = body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return (parts.length > 0 ? parts : [""]).map((text) => ({ kind: "p" as const, text }));
}

function unsubFoot(base: string, url: string | undefined, kind: OptOutKind): string {
  if (!url) return base;
  return `${base}<br><a href="${escapeHtml(url)}" style="color:#4B3FC0;text-decoration:underline;">${escapeHtml(optOutLinkLabel(kind))}</a>`;
}

function chrome(key: LetterKey, vars: Record<string, string>): {
  action?: { label: string; url: string };
  footnote?: string;
  signature?: string;
} {
  const tasks = `${appUrl()}/dashboard/tasks`;
  const login = `${appUrl()}/login`;
  if (key === "platform") {
    return {
      action: { label: "Открыть кабинет", url: tasks },
      footnote: "Это общее письмо об обновлениях. Отключить письма можно в профиле.",
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "weekly-task") {
    return {
      action: { label: "Открыть задание", url: `${appUrl()}/dashboard/weekly` },
      footnote: unsubFoot("Задание необязательное. С основными заданиями оно не связано.", vars.отписка, "weekly"),
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "daily-quote") {
    return {
      action: { label: "Открыть кабинет", url: tasks },
      footnote: unsubFoot("День считается по Москве.", vars.отписка, "quote"),
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "payment") {
    return {
      action: { label: "Открыть платформу", url: login },
      footnote: "Письмо приходит утром в день оплаты. Отключить его может наставник.",
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "guide") {
    return {
      action: { label: "Открыть материалы", url: `${appUrl()}/dashboard/materials?tab=handouts` },
      footnote: "Письмо приходит, только если наставник выбрал отправить уведомление. Отключить такие письма можно в профиле.",
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "registration") {
    return {
      action: { label: "Открыть платформу", url: login },
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "registration-mentor") {
    return { action: { label: "Открыть заявки", url: `${appUrl()}/mentor` } };
  }
  if (key === "approved") {
    return {
      action: { label: "Войти в кабинет", url: login },
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "password") {
    const url = vars.ссылка?.trim();
    if (!url) return {};
    return {
      action: { label: "Задать новый пароль", url },
      footnote: "Если вы не запрашивали смену пароля, просто удалите это письмо, пароль останется прежним.",
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "mentor-edit") {
    return {
      action: { label: "Открыть кабинет", url: vars.кабинет || tasks },
      footnote: "Одно письмо на пачку правок, не на каждое сохранение. Отключить такие письма можно в профиле.",
      signature: EMAIL_SIGNATURE,
    };
  }
  return {
    action: { label: "Открыть кабинет", url: vars.кабинет || `${appUrl()}/mentor` },
    footnote: key === "student-online"
      ? "Письмо отмечает начало захода, не каждый пинг открытой вкладки."
      : "Одно письмо на пачку правок, не на каждое сохранение.",
  };
}

/**
 * Нет сохранённого текста или он совпадает со стандартом: вернуть готовое письмо как есть.
 * Иначе тема и текст из шаблона, кнопка и подпись остаются.
 */
export function applyLetterTemplate(
  key: LetterKey,
  stored: LetterDraft | null,
  designed: LetterOutput,
  vars: Record<string, string>,
): LetterOutput {
  if (!stored || sameAsStandard(key, stored)) return designed;
  if (key === "password" && !vars.ссылка?.trim()) return designed;
  const subject = fillLetter(stored.subject, vars).trim() || designed.subject;
  const body = fillLetter(stored.body, vars);
  const letter = renderEmail({
    title: subject,
    blocks: paragraphs(body),
    ...chrome(key, vars),
  });
  return { subject, html: letter.html, text: letter.text };
}

function ruDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function dayBefore(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() - 1);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

function sentenceDate(iso: string): string | null {
  const value = ruDate(iso);
  return value ? value.replace(/\.$/, "") : null;
}

export function weeklyWhen(publishedOn: string, nextPublishedOn?: string | null): string {
  const open = sentenceDate(publishedOn);
  const close = nextPublishedOn ? sentenceDate(dayBefore(nextPublishedOn) ?? "") : null;
  if (open && close) return `Открыто с ${open}. Сдать до ${close}.`;
  if (open) return `Открыто с ${open}. Сдать, пока не выйдет следующее задание.`;
  return "Сдать, пока не выйдет следующее задание.";
}

export function weeklyVolume(lengthHint: string): string {
  const hint = lengthHint.trim();
  return hint ? `Объём: ${hint}` : "";
}
