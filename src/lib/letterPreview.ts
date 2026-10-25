import { activityLetterSamples } from "@/lib/activityLetters";
import { applyLetterTemplate, type LetterDraft, type LetterKey, type LetterOutput } from "@/lib/letterTemplates";
import { buildPaymentReminder, moscowParts } from "@/lib/paymentReminders";
import {
  approvedLetter,
  dailyQuoteLetter,
  guideOpenedLetter,
  passwordResetLetter,
  platformUpdateLetter,
  registrationStudentLetter,
  weeklyTaskLetter,
} from "@/lib/notify";
import { appUrl, renderEmail } from "@/lib/mail";

const SAMPLE: Record<LetterKey, Record<string, string>> = {
  platform: { имя: "Виктория" },
  "weekly-task": {
    имя: "Виктория",
    задание: "Комната после новости",
    текст: "Опиши комнату так, чтобы по ней было ясно: хозяин только что узнал что-то плохое.",
    срок: "Открыто с 24 октября 2026 г. Сдать до 30 октября 2026 г.",
    объём: "Объём: полстраницы",
    отписка: "https://studio.lizandwriter.ru/unsubscribe?token=preview-weekly",
  },
  "daily-quote": {
    имя: "Виктория",
    цитата: "Краткость — сестра таланта.",
    автор: "Антон Чехов",
    источник: "Письмо брату Александру, 11 апреля 1889",
    отписка: "https://studio.lizandwriter.ru/unsubscribe?token=preview-quote",
  },
  payment: { имя: "Виктория", дата: "20 октября", сумма: "Сумма — 3 500 ₽." },
  guide: { имя: "Виктория", название: "Сцена", описание: "Коротко о том, как собрать сцену." },
  registration: { имя: "Виктория" },
  "registration-mentor": { имя: "Виктория", почта: "vika@example.com", когда: "20 октября, 10:00" },
  approved: { имя: "Виктория" },
  password: { имя: "Виктория", ссылка: "https://studio.lizandwriter.ru/reset-password?token=sample" },
  "mentor-edit": { имя: "Виктория", правки: "Задания\nПредложение", кабинет: "https://studio.lizandwriter.ru/dashboard/tasks" },
  "student-edit": { имя: "Виктория", правки: "Сеттинг\nЗаметка", кабинет: "https://studio.lizandwriter.ru/student-view/sample/setting" },
  "student-online": { имя: "Виктория", когда: "20 октября, 10:15, Москва", кабинет: "https://studio.lizandwriter.ru/student-view/sample/tasks" },
};

function designed(key: LetterKey): LetterOutput {
  const sample = SAMPLE[key];
  if (key === "platform") {
    const letter = platformUpdateLetter({ name: sample.имя });
    return { subject: "Отчёт об обновлениях", ...letter };
  }
  if (key === "weekly-task") {
    const letter = weeklyTaskLetter({
      name: sample.имя,
      title: sample.задание,
      prompt: sample.текст,
      lengthHint: "полстраницы",
      publishedOn: "2026-10-24",
      nextPublishedOn: "2026-10-31",
      unsubscribeUrl: sample.отписка,
    });
    return { subject: "Задание недели", ...letter };
  }
  if (key === "daily-quote") {
    const letter = dailyQuoteLetter({
      name: sample.имя,
      text: sample.цитата,
      author: sample.автор,
      source: sample.источник,
      unsubscribeUrl: sample.отписка,
    });
    return { subject: "Цитата дня", ...letter };
  }
  if (key === "payment") {
    return buildPaymentReminder(
      { name: sample.имя, paymentAmount: 3500 },
      moscowParts(new Date("2026-10-20T07:30:00Z")),
    );
  }
  if (key === "guide") {
    const letter = guideOpenedLetter({
      name: sample.имя,
      title: sample.название,
      description: sample.описание,
      guideId: "sample",
    });
    return { subject: `Новая методичка: ${sample.название}`, ...letter };
  }
  if (key === "registration") {
    const letter = registrationStudentLetter(sample.имя);
    return { subject: "Заявка на рассмотрении", ...letter };
  }
  if (key === "registration-mentor") {
    const letter = renderEmail({
      title: "Новая заявка на доступ",
      paragraphs: [
        `Новая регистрация на платформе: ${sample.имя} (${sample.почта}), ${sample.когда}.`,
        "Заявка ждёт решения в разделе модерации.",
      ],
      action: { label: "Открыть заявки", url: `${appUrl()}/mentor` },
    });
    return { subject: "Новая заявка на доступ", ...letter };
  }
  if (key === "approved") {
    const letter = approvedLetter(sample.имя);
    return { subject: "Доступ в личный кабинет открыт", ...letter };
  }
  if (key === "password") {
    const letter = passwordResetLetter(sample.имя, sample.ссылка);
    return { subject: "Восстановление пароля", ...letter };
  }
  const activity = activityLetterSamples();
  if (key === "mentor-edit") return { subject: activity["mentor-edit"].subject, ...activity["mentor-edit"].letter };
  if (key === "student-edit") return { subject: activity["student-edit"].subject, ...activity["student-edit"].letter };
  return { subject: activity["student-online"].subject, ...activity["student-online"].letter };
}

/** Превью в редакторе. Стандартный текст показывает настоящее письмо, правка подставляет образец. */
export function previewLetter(key: LetterKey, draft: LetterDraft): LetterOutput {
  return applyLetterTemplate(key, draft, designed(key), SAMPLE[key]);
}
