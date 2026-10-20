import { activityLetterSamples } from "@/lib/activityLetters";
import { renderEmail } from "@/lib/mail";
import { buildPaymentReminder, moscowParts } from "@/lib/paymentReminders";
import { approvedLetter, guideOpenedLetter, passwordResetLetter, registrationStudentLetter } from "@/lib/notify";

/** Образцы для превью в журнале. Никуда не отправляются. */
export function broadcastPreviewHtml(): Record<string, { subject: string; html: string }> {
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
  const password = passwordResetLetter("Виктория", "https://studio.lizalikiyskaya.ru/reset-password?token=sample");
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
    "mentor-edit": { subject: activity["mentor-edit"].subject, html: activity["mentor-edit"].letter.html },
    "student-edit": { subject: activity["student-edit"].subject, html: activity["student-edit"].letter.html },
    "student-online": { subject: activity["student-online"].subject, html: activity["student-online"].letter.html },
  };
}
