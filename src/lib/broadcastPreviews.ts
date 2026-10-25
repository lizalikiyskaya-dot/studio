import { activityLetterSamples } from "@/lib/activityLetters";
import { deadlinePreviewLetters } from "@/lib/deadlineReminders";
import { renderEmail } from "@/lib/mail";
import { buildPaymentReminder, moscowParts } from "@/lib/paymentReminders";
import { approvedLetter, dailyQuoteLetter, guideOpenedLetter, passwordResetLetter, registrationStudentLetter, weeklyTaskLetter } from "@/lib/notify";

export type BroadcastPreview = {
  subject: string;
  html: string;
  label?: string;
  also?: { subject: string; html: string; label: string };
};

/** Образцы для превью в журнале. Никуда не отправляются. */
export function broadcastPreviewHtml(): Record<string, BroadcastPreview> {
  const activity = activityLetterSamples();
  const payment = buildPaymentReminder(
    { name: "Виктория", paymentAmount: 3500 },
    moscowParts(new Date("2026-10-20T07:30:00Z")),
  );
  const guide = guideOpenedLetter({
    name: "Виктория",
    title: "Сцена",
    description: "Коротко о том, как собрать сцену.",
    guideId: "sample",
  });
  const approved = approvedLetter("Виктория");
  const registration = registrationStudentLetter("Виктория");
  const password = passwordResetLetter("Виктория", "https://studio.lizandwriter.ru/reset-password?token=sample");
  const deadline = deadlinePreviewLetters();
  const toMentor = renderEmail({
    title: "Новая заявка на доступ",
    paragraphs: ["Новая регистрация на платформе: Виктория."],
  });
  return {
    payment: { subject: payment.subject, html: payment.html },
    guide: { subject: "Новая методичка: Сцена", html: guide.html },
    registration: { subject: "Заявка на рассмотрении", html: registration.html },
    "registration-mentor": { subject: "Новая заявка на доступ", html: toMentor.html },
    approved: { subject: "Доступ в личный кабинет открыт", html: approved.html },
    password: { subject: "Восстановление пароля", html: password.html },
    "weekly-task": {
      subject: "Задание недели",
      html: weeklyTaskLetter({
        name: "Виктория",
        title: "Комната после новости",
        prompt: "Опиши комнату так, чтобы по ней было ясно: хозяин только что узнал что-то плохое.",
        lengthHint: "полстраницы",
        publishedOn: "2026-10-24",
        nextPublishedOn: "2026-10-31",
        unsubscribeUrl: "https://studio.lizandwriter.ru/unsubscribe?token=preview-weekly",
      }).html,
    },
    "daily-quote": {
      subject: "Цитата дня",
      html: dailyQuoteLetter({
        name: "Виктория",
        text: "Краткость — сестра таланта.",
        author: "Антон Чехов",
        source: "Письмо брату Александру, 11 апреля 1889",
        unsubscribeUrl: "https://studio.lizandwriter.ru/unsubscribe?token=preview-quote",
      }).html,
    },
    deadline: {
      subject: deadline.formal.subject,
      html: deadline.formal.html,
      label: "Виктория, на «Вы»",
      also: { subject: deadline.informal.subject, html: deadline.informal.html, label: "Саша, на «ты»" },
    },
    "mentor-edit": { subject: activity["mentor-edit"].subject, html: activity["mentor-edit"].letter.html },
    "student-edit": { subject: activity["student-edit"].subject, html: activity["student-edit"].letter.html },
    "student-online": { subject: activity["student-online"].subject, html: activity["student-online"].letter.html },
  };
}
