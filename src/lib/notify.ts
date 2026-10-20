import { prisma } from "@/lib/prisma";
import { EMAIL_SIGNATURE, appUrl, escapeHtml, renderEmail, sendMail } from "@/lib/mail";
import { sectionLabel } from "@/lib/sections";

/**
 * Письма об изменениях в кабинете.
 *
 * Троттлинг: одно письмо в час на человека. Первое изменение уходит сразу,
 * дальнейшие в течение часа копятся молча — иначе активная правка кабинета
 * превращается в десятки писем за вечер. Окно занимается атомарно
 * (updateMany с условием по времени), поэтому две параллельные правки не
 * дадут двух писем.
 */
const THROTTLE_MS = 60 * 60 * 1000;

function moscowTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(date);
}

function moscowDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(date);
}

async function mentor() {
  return prisma.user.findFirst({
    where: { role: "MENTOR" },
    select: { id: true, name: true, email: true, emailNotifications: true },
  });
}

/** Занимает часовое окно: true — письмо слать можно, false — недавно слали. */
async function claimMentorWindow(studentId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - THROTTLE_MS);
  const res = await prisma.user.updateMany({
    where: {
      id: studentId,
      OR: [{ mentorNotifiedAt: null }, { mentorNotifiedAt: { lt: cutoff } }],
    },
    data: { mentorNotifiedAt: new Date() },
  });
  return res.count === 1;
}

async function claimStudentWindow(studentId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - THROTTLE_MS);
  const res = await prisma.user.updateMany({
    where: {
      id: studentId,
      OR: [{ studentNotifiedAt: null }, { studentNotifiedAt: { lt: cutoff } }],
    },
    data: { studentNotifiedAt: new Date() },
  });
  return res.count === 1;
}

/** Ученик что-то поправил в своём кабинете → письмо наставнику. */
export async function notifyMentorOfStudentEdit(studentId: string, section: string) {
  const [student, liza] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true, lastSeenAt: true, role: true },
    }),
    mentor(),
  ]);
  if (!student || student.role !== "STUDENT") return;
  if (!liza?.email || !liza.emailNotifications) return;
  if (!(await claimMentorWindow(studentId))) return;

  const when = moscowTime(student.lastSeenAt ?? new Date());
  const name = escapeHtml(student.name);
  // Формулировки нарочно без рода: среди учеников могут быть и мужчины,
  // а угадывать род по имени («Никита была в сети») — гарантированный ляп.
  const letter = renderEmail({
    title: "Новые изменения в кабинете",
    paragraphs: [
      `<strong>${name}</strong> — в сети в ${when}, в кабинете есть новые изменения.`,
      `Последняя правка — раздел «${escapeHtml(sectionLabel(section))}». Что именно изменилось, видно по маячкам в кабинете.`,
    ],
    action: { label: "Открыть кабинет", url: `${appUrl()}/mentor` },
    footnote:
      "Письмо приходит не чаще одного раза в час на кабинет — остальные правки за этот час копятся молча.",
  });
  await sendMail({
    to: liza.email,
    subject: `${student.name}: новые изменения в кабинете`,
    ...letter,
    type: "student-edit",
    recipientUserId: liza.id,
  });
}

/**
 * Наставник поправил кабинет ученика → письмо ученику.
 * По умолчанию выключено: писем слишком много. Маячки в кабинете от этого
 * не зависят — их пишет markSectionActivity до вызова. Включить обратно:
 * STUDENT_EDIT_EMAILS=on.
 */
export async function notifyStudentOfMentorEdit(studentId: string, section: string) {
  if (process.env.STUDENT_EDIT_EMAILS !== "on") return;
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { email: true, status: true, emailNotifications: true },
  });
  if (!student?.email || !student.emailNotifications) return;
  // Ученику без доступа писать незачем — он всё равно не откроет кабинет.
  if (student.status !== "APPROVED") return;
  if (!(await claimStudentWindow(studentId))) return;

  const letter = mentorEditLetter(sectionLabel(section));
  await sendMail({
    to: student.email,
    subject: "Наставник внёс изменения",
    ...letter,
    type: "mentor-edit",
    recipientUserId: studentId,
  });
}

/** Текст письма о правках. Само письмо не уходит, пока STUDENT_EDIT_EMAILS не равен on. */
export function mentorEditLetter(section: string) {
  return renderEmail({
    title: "Наставник внёс изменения",
    paragraphs: [
      "Я поработала с вашим кабинетом. В разделе «" + escapeHtml(section) + "» есть новые правки.",
      "Разделы с изменениями отмечены маячками в боковом меню. Правки в тексте можно принять или отклонить.",
    ],
    action: { label: "Открыть кабинет", url: `${appUrl()}/dashboard/tasks` },
    footnote: "Письмо приходит не чаще одного раза в час.",
    signature: EMAIL_SIGNATURE,
  });
}

/** Регистрация: подтверждение ученику и уведомление наставнику. */
export async function notifyRegistration(user: { id: string; name: string; email: string }) {
  const liza = await mentor();

  const toStudent = registrationStudentLetter(user.name);
  await sendMail({
    to: user.email,
    subject: "Заявка на рассмотрении",
    ...toStudent,
    type: "registration",
    recipientUserId: user.id,
  });

  if (liza?.email) {
    const toMentor = renderEmail({
      title: "Новая заявка на доступ",
      paragraphs: [
        `Новая регистрация на платформе — ${escapeHtml(user.name)} (${escapeHtml(user.email)}), ${moscowDateTime(new Date())}.`,
        "Заявка ждёт решения в разделе модерации.",
      ],
      action: { label: "Открыть заявки", url: `${appUrl()}/mentor` },
    });
    await sendMail({
      to: liza.email,
      subject: "Новая заявка на доступ",
      ...toMentor,
      type: "registration-mentor",
      recipientUserId: liza.id,
    });
  }
}

export function registrationStudentLetter(name: string) {
  return renderEmail({
    title: "Заявка на рассмотрении",
    paragraphs: [
      `${escapeHtml(name)}, я получила вашу заявку.`,
      "Посмотрю её и открою кабинет. Когда открою — напишу ещё раз.",
    ],
    action: { label: "Открыть платформу", url: `${appUrl()}/login` },
    signature: EMAIL_SIGNATURE,
  });
}

/** Наставник одобрил заявку → письмо ученику. */
export async function notifyApproved(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user?.email) return;

  const letter = approvedLetter(user.name);
  await sendMail({
    to: user.email,
    subject: "Доступ в личный кабинет открыт",
    ...letter,
    type: "approved",
    recipientUserId: userId,
  });
}

export function approvedLetter(name: string) {
  return renderEmail({
    title: "Доступ в личный кабинет открыт",
    paragraphs: [
      `${escapeHtml(name)}, я открыла вам кабинет.`,
      "Входите той же почтой и паролем, что указали при регистрации.",
    ],
    action: { label: "Войти в кабинет", url: `${appUrl()}/login` },
    signature: EMAIL_SIGNATURE,
  });
}

/**
 * Наставник открыл ученику методичку и нажал «Отправить».
 * Вызывать только в этом случае: само по себе открытие письмо не шлёт.
 * Ученику без доступа и с выключенными уведомлениями не пишем.
 * Ошибку почты наружу не бросает.
 */
export async function notifyStudentGuideOpened(
  studentId: string,
  guide: { id: string; title: string; description: string }
) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, email: true, status: true, emailNotifications: true },
  });
  if (!student?.email || !student.emailNotifications) return;
  if (student.status !== "APPROVED") return;

  const title = (guide.title.trim() || "Методичка").replace(/[\r\n]+/g, " ").slice(0, 180);
  const letter = guideOpenedLetter({
    name: student.name,
    title,
    description: guide.description,
    guideId: guide.id,
  });
  await sendMail({
    to: student.email,
    subject: `Новая методичка: ${title}`,
    ...letter,
    type: "guide",
    recipientUserId: studentId,
  });
}

export function guideOpenedLetter(guide: { name: string; title: string; description: string; guideId: string }) {
  const paragraphs = [
    `${escapeHtml(guide.name)}, я открыла вам методичку «${escapeHtml(guide.title)}».`,
  ];
  const about = guide.description.trim();
  if (about) paragraphs.push(escapeHtml(about));
  paragraphs.push("Она в разделе «Материалы». Файл можно скачать там.");

  return renderEmail({
    title: "Новая методичка",
    paragraphs,
    action: { label: "Открыть материалы", url: `${appUrl()}/dashboard/materials?tab=handouts` },
    footnote: "Письмо приходит, только если наставник выбрал отправить уведомление. Отключить такие письма можно в профиле.",
    signature: EMAIL_SIGNATURE,
  });
}

/** Письмо со ссылкой на смену пароля. */
export async function sendPasswordResetEmail(
  user: { id: string; name: string; email: string },
  token: string
) {
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const letter = passwordResetLetter(user.name, url);
  await sendMail({
    to: user.email,
    subject: "Восстановление пароля",
    ...letter,
    type: "password",
    recipientUserId: user.id,
  });
}

export function passwordResetLetter(name: string, url: string) {
  return renderEmail({
    title: "Восстановление пароля",
    paragraphs: [
      `${escapeHtml(name)}, вы попросили сменить пароль.`,
      "Ссылка действует один час и сработает только один раз.",
    ],
    action: { label: "Задать новый пароль", url },
    footnote:
      "Если вы не запрашивали смену пароля — просто удалите это письмо, пароль останется прежним.",
    signature: EMAIL_SIGNATURE,
  });
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

/**
 * Отчёт ученикам о том, что уже есть в кабинете.
 * Только рисует письмо. Никуда не отправляет и расписание не трогает.
 */
export function platformUpdateLetter(input: { name: string }) {
  const name = input.name.trim() || "Здравствуйте";
  return renderEmail({
    title: "Отчёт об обновлениях",
    blocks: [
      { kind: "p", text: `${name}, коротко о том, что изменилось в кабинете, и куда нажать.` },
      {
        kind: "section",
        title: "Задания",
        items: [
          "Поле больше не съезжает в сторону, когда вы правите текст.",
          "Мою правку можно принять или отклонить по куску. Кнопки стоят у этого куска.",
        ],
        hint: "Куда нажать: левое меню, пункт «Задания».",
      },
      {
        kind: "section",
        title: "План работы",
        items: [
          "Фильтры те же, что у заданий: «В процессе», «Запланировано», «Все задачи».",
          "Срок берётся из самого задания. Месяц показан списком.",
        ],
        hint: "Куда нажать: левое меню, пункт «План работы».",
      },
      {
        kind: "section",
        title: "Книга",
        items: ["Счётчик «2 из 3» пишется, только если книг или циклов несколько."],
        hint: "Куда нажать: карточка книги в левом меню.",
      },
      {
        kind: "section",
        title: "Сеттинг",
        items: [
          "Ползунки типа сеттинга стоят в светлой рамке.",
          "В «Библии мира» темы показаны чипами. Лист открывается снизу. Есть общая заметка.",
        ],
        hint: "Куда нажать: левое меню, пункт «Сеттинг».",
      },
      {
        kind: "section",
        title: "Заметки",
        items: [
          "Если выделить текст внутри поля, кнопка «Заметка» не появляется. Стирание и набор работают как обычно.",
          "Заметку по-прежнему можно поставить на обычный текст страницы.",
        ],
        hint: "Куда нажать: выделите текст страницы вне поля.",
      },
      {
        kind: "section",
        title: "Материалы",
        items: ["Методички лежат в общем списке. PDF открывается на сайте."],
        hint: "Куда нажать: левое меню, пункт «Материалы».",
      },
      {
        kind: "section",
        title: "Еженедельное задание",
        items: [
          "Это короткое необязательное задание на одну неделю.",
          "Оно не связано с основными заданиями.",
          "Текст сдаёте на той же странице. За сдачу начисляются 2 звёздочки.",
        ],
        hint: "Куда нажать: левое меню, пункт «Задание недели».",
      },
      {
        kind: "section",
        title: "Цитата дня",
        items: [
          "Это одна цитата писателя о ремесле.",
          "День считается по Москве, поэтому у всех в эти сутки одна и та же цитата.",
          "Отдельной страницы нет.",
        ],
        hint: "Куда нажать: левое меню, над календарём.",
      },
      { kind: "p", text: "Если пункт не находится, напишите мне." },
    ],
    action: { label: "Открыть кабинет", url: `${appUrl()}/dashboard/tasks` },
    footnote: "Это общее письмо об обновлениях. Отключить письма можно в профиле.",
    signature: EMAIL_SIGNATURE,
  });
}

/**
 * Письмо с заданием недели. Поля те же, что у WeeklyTask.
 * nextPublishedOn: дата следующего задания. Срок сдачи: день до неё.
 * Только рисует письмо.
 */
export function weeklyTaskLetter(input: {
  name: string;
  title: string;
  prompt: string;
  lengthHint: string;
  publishedOn: string;
  nextPublishedOn?: string | null;
}) {
  const open = ruDate(input.publishedOn);
  const close = input.nextPublishedOn ? ruDate(dayBefore(input.nextPublishedOn) ?? "") : null;
  const when = open && close
    ? `Открыто с ${open}. Сдать до ${close}.`
    : open
      ? `Открыто с ${open}. Сдать, пока не выйдет следующее задание.`
      : "Сдать, пока не выйдет следующее задание.";
  const meta = [when];
  if (input.lengthHint.trim()) meta.push(`Объём: ${input.lengthHint.trim()}`);
  return renderEmail({
    title: "Задание недели",
    blocks: [
      { kind: "p", text: `${input.name.trim() || "Здравствуйте"}, на этой неделе такое задание.` },
      {
        kind: "card",
        kicker: open ?? undefined,
        title: input.title.trim() || "Задание",
        body: input.prompt.trim(),
        meta,
      },
    ],
    action: { label: "Открыть задание", url: `${appUrl()}/dashboard/weekly` },
    footnote: "Задание необязательное. С основными заданиями оно не связано.",
    signature: EMAIL_SIGNATURE,
  });
}

/** Письмо с цитатой дня. Поля те же, что у цитаты в кабинете. Только рисует письмо. */
export function dailyQuoteLetter(input: { name: string; text: string; author: string; source?: string }) {
  return renderEmail({
    title: "Цитата дня",
    blocks: [
      { kind: "p", text: `${input.name.trim() || "Здравствуйте"}, сегодня такая цитата.` },
      {
        kind: "quote",
        text: input.text.trim(),
        author: input.author.trim(),
        source: input.source?.trim() || undefined,
      },
      { kind: "p", text: "Она в левом меню, над календарём." },
    ],
    action: { label: "Открыть кабинет", url: `${appUrl()}/dashboard/tasks` },
    footnote: "День считается по Москве. Отключить письма можно в профиле.",
    signature: EMAIL_SIGNATURE,
  });
}

/** Образцы для превью. Данные как в кабинете, письмо никуда не уходит. */
export function designerLetterPreviews() {
  return {
    platform: platformUpdateLetter({ name: "Виктория" }),
    weekly: weeklyTaskLetter({
      name: "Виктория",
      title: "Комната после новости",
      prompt:
        "Опиши комнату так, чтобы по ней было ясно: хозяин только что узнал что-то плохое. Слово «плохо», названия эмоций и сама новость не пиши. Покажи это через вещи, свет, порядок или беспорядок.",
      lengthHint: "полстраницы",
      publishedOn: "2026-10-24",
      nextPublishedOn: "2026-10-31",
    }),
    quote: dailyQuoteLetter({
      name: "Виктория",
      text: "Краткость — сестра таланта.",
      author: "Антон Чехов",
      source: "Письмо брату Александру, 11 апреля 1889",
    }),
  };
}
