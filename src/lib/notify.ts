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
  await sendMail({ to: liza.email, subject: `${student.name}: новые изменения в кабинете`, ...letter });
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
  await sendMail({ to: student.email, subject: "Наставник внёс изменения", ...letter });
}

/** Текст письма о правках. Само письмо не уходит, пока STUDENT_EDIT_EMAILS не равен on. */
export function mentorEditLetter(section: string) {
  return renderEmail({
    title: "Наставник внёс изменения",
    paragraphs: [
      "Лиза поработала с вашим кабинетом — в разделе «" + escapeHtml(section) + "» есть новые правки.",
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
  await sendMail({ to: user.email, subject: "Заявка на рассмотрении", ...toStudent });

  if (liza?.email) {
    const toMentor = renderEmail({
      title: "Новая заявка на доступ",
      paragraphs: [
        `Новая регистрация на платформе — ${escapeHtml(user.name)} (${escapeHtml(user.email)}), ${moscowDateTime(new Date())}.`,
        "Заявка ждёт решения в разделе модерации.",
      ],
      action: { label: "Открыть заявки", url: `${appUrl()}/mentor` },
    });
    await sendMail({ to: liza.email, subject: "Новая заявка на доступ", ...toMentor });
  }
}

export function registrationStudentLetter(name: string) {
  return renderEmail({
    title: "Заявка на рассмотрении",
    paragraphs: [
      `Спасибо за регистрацию, ${escapeHtml(name)}.`,
      "Наставник проверит заявку и откроет доступ в личный кабинет. Это может занять некоторое время — как только доступ откроют, вам придёт письмо.",
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
  await sendMail({ to: user.email, subject: "Доступ в личный кабинет открыт", ...letter });
}

export function approvedLetter(name: string) {
  return renderEmail({
    title: "Доступ в личный кабинет открыт",
    paragraphs: [
      `${escapeHtml(name)}, наставник одобрил вашу заявку — личный кабинет открыт.`,
      "Входите под той же почтой и паролем, которые указали при регистрации.",
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
  await sendMail({ to: student.email, subject: `Новая методичка: ${title}`, ...letter });
}

export function guideOpenedLetter(guide: { name: string; title: string; description: string; guideId: string }) {
  const paragraphs = [
    `${escapeHtml(guide.name)}, в кабинете открыта методичка «${escapeHtml(guide.title)}».`,
  ];
  const about = guide.description.trim();
  if (about) paragraphs.push(escapeHtml(about));
<<<<<<< HEAD
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
  user: { name: string; email: string },
  token: string
) {
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const letter = passwordResetLetter(user.name, url);
  await sendMail({ to: user.email, subject: "Восстановление пароля", ...letter });
}

export function passwordResetLetter(name: string, url: string) {
  return renderEmail({
    title: "Восстановление пароля",
    paragraphs: [
      `${escapeHtml(name)}, вы запросили смену пароля на платформе.`,
      "Ссылка действует один час и сработает только один раз.",
    ],
    action: { label: "Задать новый пароль", url },
    footnote:
      "Если вы не запрашивали смену пароля — просто удалите это письмо, пароль останется прежним.",
    signature: EMAIL_SIGNATURE,
  });
}
