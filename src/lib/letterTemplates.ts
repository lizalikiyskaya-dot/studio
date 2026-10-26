import { addressForm, addressVars } from "@/lib/addressForm";
import { EMAIL_SIGNATURE, appUrl, escapeHtml, renderEmail, type EmailBlock } from "@/lib/mail";
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
      "Задания\nПоле больше не съезжает в сторону, когда {правишь} текст.\nМою правку можно принять или отклонить по куску. Кнопки стоят у этого куска.\nКуда нажать: левое меню, пункт «Задания».",
      "План работы\nФильтры те же, что у заданий: «В процессе», «Запланировано», «Все задачи».\nСрок берётся из самого задания. Месяц показан списком.\nКуда нажать: левое меню, пункт «План работы».",
      "Книга\nСчётчик «2 из 3» пишется, только если книг или циклов несколько.\nКуда нажать: карточка книги в левом меню.",
      "Сеттинг\nФото слева сверху. Справа виджет «Тип сеттинга»: квадрат и «Итог».\nКарточки «Библии мира» открываются на месте.\nЖёлтый стикер: коротко о мире, список пунктов и заметка к каждой теме.\nКуда нажать: левое меню, пункт «Сеттинг».",
      "Заметки\nЕсли выделить текст внутри поля, кнопка «Заметка» не появляется. Стирание и набор работают как обычно.\nЗаметку по-прежнему можно поставить на обычный текст страницы.\nКуда нажать: {выдели} текст страницы вне поля.",
      "Материалы\nУ методички есть кнопка «Скачать».\nКуда нажать: левое меню, пункт «Материалы».",
      "Еженедельное задание\nЭто короткое необязательное задание на одну неделю.\nОно не связано с основными заданиями.\nТекст {сдаёшь} на той же странице. За сдачу начисляются 2 звёздочки.\nКуда нажать: левое меню, пункт «Задание недели».",
      "Цитата дня\nЭто одна цитата писателя о ремесле.\nДень считается по Москве, поэтому у всех в эти сутки одна и та же цитата.\nОтдельной страницы нет.",
      "Если пункт не находится, {напиши} мне.",
    ].join("\n\n"),
    placeholders: ["имя", "правишь", "выдели", "сдаёшь", "напиши"],
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
    body: "{имя}, сегодня {дата} — день оплаты.\n\n{сумма}\n\nЕсли дата или сумма изменились, {напиши} мне в Телеграме.",
    placeholders: ["имя", "дата", "сумма", "напиши"],
  },
  guide: {
    title: "Методичка",
    subject: "Новая методичка: {название}",
    body: "{имя}, я открыла {кому} методичку «{название}».\n\n{описание}\n\nОна в разделе «Материалы». Файл можно скачать там.",
    placeholders: ["имя", "название", "описание", "кому"],
  },
  registration: {
    title: "Заявка ученику",
    subject: "Заявка на рассмотрении",
    body: "{имя}, я получила {чью} заявку.\n\nПосмотрю её и открою кабинет. Когда открою, напишу ещё раз.",
    placeholders: ["имя", "чью"],
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
    body: "{имя}, я открыла {кому} кабинет.\n\n{Входи} той же почтой и паролем, {регистрация}.",
    placeholders: ["имя", "кому", "Входи", "регистрация"],
  },
  password: {
    title: "Восстановление пароля",
    subject: "Восстановление пароля",
    body: "{имя}, {просьба}\n\nСсылка действует один час и сработает только один раз.",
    placeholders: ["имя", "просьба"],
  },
  "mentor-edit": {
    title: "Наставник внёс правку",
    subject: "Наставник внёс правку",
    body: "{имя}, я внесла правки в {чей} кабинет.\n\n{правки}",
    placeholders: ["имя", "правки", "чей"],
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

/** Прежние стандартные тексты. Совпадение с ними не считается правкой Лизы. */
const LEGACY_BODIES: Partial<Record<LetterKey, string[]>> = {
  platform: [
    [
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
  ],
  payment: ["{имя}, сегодня {дата} — день оплаты.\n\n{сумма}\n\nЕсли дата или сумма изменились, напишите мне в Телеграме."],
  guide: ["{имя}, я открыла вам методичку «{название}».\n\n{описание}\n\nОна в разделе «Материалы». Файл можно скачать там."],
  registration: ["{имя}, я получила вашу заявку.\n\nПосмотрю её и открою кабинет. Когда открою, напишу ещё раз."],
  approved: ["{имя}, я открыла вам кабинет.\n\nВходите той же почтой и паролем, что указали при регистрации."],
  password: ["{имя}, вы попросили сменить пароль.\n\nСсылка действует один час и сработает только один раз."],
  "mentor-edit": ["{имя}, я внесла правки в ваш кабинет.\n\n{правки}"],
};

export function sameAsStandard(key: LetterKey, draft: LetterDraft): boolean {
  const standard = standardDraft(key);
  if (norm(draft.subject) !== norm(standard.subject)) return false;
  const body = norm(draft.body);
  if (body === norm(standard.body)) return true;
  return (LEGACY_BODIES[key] ?? []).some((item) => norm(item) === body);
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
  const filled = template.replace(/\{([^{}]+)\}/g, (token, name: string) => {
    const value = vars[name];
    return value == null ? token : value;
  });
  if (vars.имя !== "") return filled;
  return filled
    .replace(/(^|\n),\s*/g, "$1")
    .replace(/(^|\n)([а-яa-zё])/gu, (_lead, edge: string, letter: string) => edge + letter.toLocaleUpperCase("ru-RU"));
}

const WEEKLY_TOKENS = new Set(["задание", "текст", "срок", "объём"]);
const QUOTE_TOKENS = new Set(["цитата", "автор", "источник"]);

function paragraphParts(body: string): string[] {
  const parts = body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [""];
}

function lineToken(line: string): string | null {
  const match = /^(?:«\{([^{}]+)\}»|\{([^{}]+)\})$/.exec(line.trim());
  return match ? (match[1] ?? match[2]) : null;
}

function pureTokenNames(paragraph: string, allowed: Set<string>): string[] | null {
  const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const names: string[] = [];
  for (const line of lines) {
    const name = lineToken(line);
    if (!name || !allowed.has(name)) return null;
    names.push(name);
  }
  return names;
}

function weeklyKicker(when: string): string | undefined {
  const match = /Открыто с ([^.]+)\./.exec(when);
  return match ? `${match[1]}.` : undefined;
}

function weeklyCard(names: string[], vars: Record<string, string>): EmailBlock {
  const has = (name: string) => names.includes(name);
  const when = has("срок") ? (vars.срок ?? "").trim() : "";
  const volume = has("объём") ? (vars.объём ?? "").trim() : "";
  const meta = [when, volume].filter(Boolean);
  const body = has("текст") ? (vars.текст ?? "").trim() : "";
  return {
    kind: "card",
    kicker: when ? weeklyKicker(when) : undefined,
    title: has("задание") ? ((vars.задание ?? "").trim() || "Задание") : "Задание",
    body: body || undefined,
    meta: meta.length > 0 ? meta : undefined,
  };
}

function quoteBlock(names: string[], vars: Record<string, string>): EmailBlock {
  const source = names.includes("источник") ? (vars.источник ?? "").trim() : "";
  return {
    kind: "quote",
    text: (vars.цитата ?? "").trim(),
    author: (vars.автор ?? "").trim(),
    source: source || undefined,
  };
}

const ADDRESS_KEYS = new Set([
  "кому",
  "чью",
  "чей",
  "чьим",
  "напиши",
  "правишь",
  "сдаёшь",
  "Входи",
  "выдели",
  "просьба",
  "регистрация",
]);

/** «Вы» / «ты» из имени, если вызывающий код передал только {имя}. Явные ключи важнее. */
function varsForFill(vars: Record<string, string>): Record<string, string> {
  return { ...addressVars(vars.имя ?? ""), ...vars };
}

function fillAddressTokens(paragraph: string, vars: Record<string, string>): string {
  const filled = varsForFill(vars);
  return paragraph.replace(/\{([^{}]+)\}/g, (token, name: string) => {
    if (!ADDRESS_KEYS.has(name)) return token;
    const value = filled[name];
    return value == null ? token : value;
  });
}

function asSection(paragraph: string): EmailBlock | null {
  if (/\{[^{}]+\}/.test(paragraph)) return null;
  const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const title = lines[0];
  if (title.length > 60 || /[.!?,:;]/.test(title)) return null;
  let hint: string | undefined;
  const items: string[] = [];
  for (const line of lines.slice(1)) {
    if (/^Куда нажать\s*:/.test(line)) hint = line;
    else items.push(line);
  }
  if (items.length === 0 || (!hint && items.length < 2)) return null;
  return { kind: "section", title, items, hint };
}

function editsBlocks(key: LetterKey, raw: string): EmailBlock[] {
  const groups = raw.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks = groups.length > 0 ? groups : [""];
  return chunks.map((group) => {
    const lines = group.split("\n").map((line) => line.trim()).filter(Boolean);
    let hint: string | undefined;
    const content = lines.filter((line) => {
      if (/^Куда нажать\s*:/.test(line)) {
        hint = line;
        return false;
      }
      return true;
    });
    const title = content[0] || "Правки";
    const items = content.slice(1);
    const where =
      key === "student-edit"
        ? `Куда нажать: кабинет, пункт «${title}».`
        : key === "mentor-edit"
          ? `Куда нажать: левое меню, пункт «${title}».`
          : undefined;
    return {
      kind: "section" as const,
      title,
      items: items.length > 0 ? items : ["Есть новые правки."],
      hint: hint ?? where,
    };
  });
}

/** Незаполненный текст: плейсхолдеры карточки, цитаты и разделов остаются блоками письма. */
function blocksFromTemplate(key: LetterKey, body: string, vars: Record<string, string>): EmailBlock[] {
  const blocks: EmailBlock[] = [];
  let weekly: string[] = [];
  let quote: string[] = [];

  function flushWeekly() {
    if (weekly.length === 0) return;
    blocks.push(weeklyCard(weekly, vars));
    weekly = [];
  }
  function flushQuote() {
    if (quote.length === 0) return;
    blocks.push(quoteBlock(quote, vars));
    quote = [];
  }

  for (const part of paragraphParts(body)) {
    const weekNames = pureTokenNames(part, WEEKLY_TOKENS);
    if (weekNames) {
      flushQuote();
      weekly.push(...weekNames);
      continue;
    }
    const quoteNames = pureTokenNames(part, QUOTE_TOKENS);
    if (quoteNames) {
      flushWeekly();
      quote.push(...quoteNames);
      continue;
    }
    flushWeekly();
    flushQuote();
    if (part === "{правки}") {
      blocks.push(...editsBlocks(key, vars.правки ?? ""));
      continue;
    }
    const section = asSection(fillAddressTokens(part, vars));
    if (section) {
      blocks.push(section);
      continue;
    }
    blocks.push({ kind: "p", text: fillLetter(part, varsForFill(vars)) });
  }
  flushWeekly();
  flushQuote();
  return blocks;
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
      footnote: unsubFoot("Письмо приходит утром в день оплаты. Отключить его может наставник.", vars.отписка, "mail"),
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
      footnote: addressForm(vars.имя ?? "").passwordFoot,
      signature: EMAIL_SIGNATURE,
    };
  }
  if (key === "mentor-edit") {
    return {
      action: { label: "Открыть кабинет", url: vars.кабинет || tasks },
      footnote: unsubFoot("Одно письмо на пачку правок за час, не на каждое сохранение.", vars.отписка, "mail"),
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
 * Иначе сохранённый текст встаёт в ту же рамку: шапка, карточки, кнопка и подпись.
 * Текст в базе не переписывается.
 */
export function applyLetterTemplate(
  key: LetterKey,
  stored: LetterDraft | null,
  designed: LetterOutput,
  vars: Record<string, string>,
): LetterOutput {
  if (!stored || sameAsStandard(key, stored)) return designed;
  if (key === "password" && !vars.ссылка?.trim()) return designed;
  const subject = fillLetter(stored.subject, varsForFill(vars)).trim() || designed.subject;
  const letter = renderEmail({
    title: subject,
    blocks: blocksFromTemplate(key, stored.body, vars),
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
