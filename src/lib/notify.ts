import { addressForm, withAddress, withGreeting } from "@/lib/addressForm";
import { prisma } from "@/lib/prisma";
import { EMAIL_SIGNATURE, appUrl, escapeHtml, renderEmail, sendMail } from "@/lib/mail";
import { optOutLinkLabel, type OptOutKind } from "@/lib/mailOptOut";
import { dressLetter } from "@/lib/letterTemplateStore";
import { sectionLabel } from "@/lib/sections";
import { mailGate, queueCabinetChange } from "@/lib/activityDigest";

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
  const gate = await queueCabinetChange({
    studentId,
    byMentor: false,
    section,
    detail: sectionLabel(section),
  });
  if (gate !== "legacy") return;
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
 * Старый вход от набора в поле. Пачку «Наставник внёс правку» теперь
 * собирают явные действия: статус, заметка, правка текста и ссылка на отзыв.
 * Набор сам по себе сюда больше не попадает. Если таблицы рассылок ещё нет,
 * письмо уходит только при STUDENT_EDIT_EMAILS=on.
 */
export async function notifyStudentOfMentorEdit(studentId: string, section: string) {
  const gate = await queueCabinetChange({
    studentId,
    byMentor: true,
    section,
    detail: sectionLabel(section),
  });
  if (gate !== "legacy") return;
  if (process.env.STUDENT_EDIT_EMAILS !== "on") return;
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, email: true, status: true, emailNotifications: true },
  });
  if (!student?.email || !student.emailNotifications) return;
  // Ученику без доступа писать незачем — он всё равно не откроет кабинет.
  if (student.status !== "APPROVED") return;
  if (!(await claimStudentWindow(studentId))) return;

  const letter = mentorEditLetter(sectionLabel(section), student.name);
  await sendMail({
    to: student.email,
    subject: "Наставник внёс изменения",
    ...letter,
    type: "mentor-edit",
    recipientUserId: studentId,
  });
}

/** Текст письма о правках. Само письмо не уходит, пока STUDENT_EDIT_EMAILS не равен on. */
export function mentorEditLetter(section: string, name = "") {
  const form = addressForm(name);
  return renderEmail({
    title: "Наставник внёс изменения",
    paragraphs: [
      `${escapeHtml(withGreeting(name, `я поработала с ${form.yourMIns} кабинетом.`))} В разделе «${escapeHtml(section)}» есть новые правки.`,
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
  const studentGate = await mailGate("registration", user.id);
  if (studentGate.ok) {
    const letter = await dressLetter(
      "registration",
      { subject: "Заявка на рассмотрении", ...toStudent },
      withAddress(user.name, {}),
    );
    await sendMail({
      to: user.email,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
      type: "registration",
      recipientUserId: user.id,
      from: studentGate.from,
      replyTo: studentGate.replyTo,
    });
  }

  const mentorGate = await mailGate("registration-mentor");
  if (liza?.email && mentorGate.ok) {
    const when = moscowDateTime(new Date());
    const toMentor = renderEmail({
      title: "Новая заявка на доступ",
      paragraphs: [
        `Новая регистрация на платформе — ${escapeHtml(user.name)} (${escapeHtml(user.email)}), ${when}.`,
        "Заявка ждёт решения в разделе модерации.",
      ],
      action: { label: "Открыть заявки", url: `${appUrl()}/mentor` },
    });
    const letter = await dressLetter(
      "registration-mentor",
      { subject: "Новая заявка на доступ", ...toMentor },
      { имя: user.name, почта: user.email, когда: when },
    );
    await sendMail({
      to: liza.email,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
      type: "registration-mentor",
      recipientUserId: liza.id,
      from: mentorGate.from,
      replyTo: mentorGate.replyTo,
    });
  }
}

export function registrationStudentLetter(name: string) {
  const form = addressForm(name);
  return renderEmail({
    title: "Заявка на рассмотрении",
    paragraphs: [
      escapeHtml(withGreeting(name, `я получила ${form.yourFAcc} заявку.`)),
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

  const gate = await mailGate("approved", userId);
  if (!gate.ok) return;
  const letter = await dressLetter("approved", { subject: "Доступ в личный кабинет открыт", ...approvedLetter(user.name) }, withAddress(user.name, {}));
  await sendMail({
    to: user.email,
    subject: letter.subject,
    html: letter.html,
    text: letter.text,
    type: "approved",
    recipientUserId: userId,
    from: gate.from,
    replyTo: gate.replyTo,
  });
}

export function approvedLetter(name: string) {
  const form = addressForm(name);
  return renderEmail({
    title: "Доступ в личный кабинет открыт",
    paragraphs: [
      escapeHtml(withGreeting(name, `я открыла ${form.toYou} кабинет.`)),
      `${form.enter} той же почтой и паролем, ${form.registered}.`,
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
  const gate = await mailGate("guide", studentId);
  if (!gate.ok) return;

  const title = (guide.title.trim() || "Методичка").replace(/[\r\n]+/g, " ").slice(0, 180);
  const designed = guideOpenedLetter({
    name: student.name,
    title,
    description: guide.description,
    guideId: guide.id,
  });
  const letter = await dressLetter(
    "guide",
    { subject: `Новая методичка: ${title}`, ...designed },
    withAddress(student.name, { название: title, описание: guide.description.trim() }),
  );
  await sendMail({
    to: student.email,
    subject: letter.subject,
    html: letter.html,
    text: letter.text,
    type: "guide",
    recipientUserId: studentId,
    from: gate.from,
    replyTo: gate.replyTo,
  });
}

export function guideOpenedLetter(guide: { name: string; title: string; description: string; guideId: string }) {
  const paragraphs = [
    escapeHtml(withGreeting(guide.name, `я открыла ${addressForm(guide.name).toYou} методичку «${guide.title}».`)),
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
  const gate = await mailGate("password", user.id);
  if (!gate.ok) return;
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const letter = await dressLetter(
    "password",
    { subject: "Восстановление пароля", ...passwordResetLetter(user.name, url) },
    withAddress(user.name, { ссылка: url }),
  );
  await sendMail({
    to: user.email,
    subject: letter.subject,
    html: letter.html,
    text: letter.text,
    type: "password",
    recipientUserId: user.id,
    from: gate.from,
    replyTo: gate.replyTo,
  });
}

export function passwordResetLetter(name: string, url: string) {
  const form = addressForm(name);
  return renderEmail({
    title: "Восстановление пароля",
    paragraphs: [
      escapeHtml(withGreeting(name, form.passwordAsk)),
      "Ссылка действует один час и сработает только один раз.",
    ],
    action: { label: "Задать новый пароль", url },
    footnote: form.passwordFoot,
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
  const form = addressForm(input.name);
  return renderEmail({
    title: "Отчёт об обновлениях",
    blocks: [
      { kind: "p", text: withGreeting(input.name, "коротко о том, что изменилось в кабинете, и куда нажать.") },
      {
        kind: "section",
        title: "Задания",
        items: [
          `Поле больше не съезжает в сторону, когда ${form.whenEdit} текст.`,
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
          "Фото слева сверху. Справа виджет «Тип сеттинга»: квадрат и «Итог».",
          "Карточки «Библии мира» открываются на месте.",
          "Жёлтый стикер: коротко о мире, список пунктов и заметка к каждой теме.",
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
        hint: `Куда нажать: ${form.select} текст страницы вне поля.`,
      },
      {
        kind: "section",
        title: "Материалы",
        items: ["У методички есть кнопка «Скачать»."],
        hint: "Куда нажать: левое меню, пункт «Материалы».",
      },
      {
        kind: "section",
        title: "Еженедельное задание",
        items: [
          "Это короткое необязательное задание на одну неделю.",
          "Оно не связано с основными заданиями.",
          `Текст ${form.submit} на той же странице. За сдачу начисляются 2 звёздочки.`,
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
      },
      { kind: "p", text: `Если пункт не находится, ${form.write} мне.` },
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
  unsubscribeUrl?: string;
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
      { kind: "p", text: withGreeting(input.name, "на этой неделе такое задание.") },
      {
        kind: "card",
        kicker: open ?? undefined,
        title: input.title.trim() || "Задание",
        body: input.prompt.trim(),
        meta,
      },
    ],
    action: { label: "Открыть задание", url: `${appUrl()}/dashboard/weekly` },
    footnote: unsubFoot(
      "Задание необязательное. С основными заданиями оно не связано.",
      input.unsubscribeUrl,
      "weekly",
    ),
    signature: EMAIL_SIGNATURE,
  });
}

/** Письмо с цитатой дня. Поля те же, что у цитаты в кабинете. Только рисует письмо. */
export function dailyQuoteLetter(input: { name: string; text: string; author: string; source?: string; unsubscribeUrl?: string }) {
  return renderEmail({
    title: "Цитата дня",
    blocks: [
      { kind: "p", text: withGreeting(input.name, "сегодня такая цитата.") },
      {
        kind: "quote",
        text: input.text.trim(),
        author: input.author.trim(),
        source: input.source?.trim() || undefined,
      },
    ],
    action: { label: "Открыть кабинет", url: `${appUrl()}/dashboard/tasks` },
    footnote: unsubFoot("День считается по Москве.", input.unsubscribeUrl, "quote"),
    signature: EMAIL_SIGNATURE,
  });
}

function unsubFoot(base: string, url: string | undefined, kind: OptOutKind): string {
  if (!url) return base;
  return `${base}<br><a href="${escapeHtml(url)}" style="color:#4B3FC0;text-decoration:underline;">${escapeHtml(optOutLinkLabel(kind))}</a>`;
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
