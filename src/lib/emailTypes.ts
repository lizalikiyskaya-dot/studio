/** Код типа письма → подпись в кабинете наставника. */
export const EMAIL_TYPE_LABEL: Record<string, string> = {
  "student-edit": "Правки ученика",
  "mentor-edit": "Правки наставника",
  registration: "Заявка",
  "registration-mentor": "Заявка наставнику",
  approved: "Доступ открыт",
  guide: "Методичка",
  password: "Пароль",
  payment: "Оплата",
  deadline: "Срок задания",
  "note-reminder": "Открытые заметки",
  "platform-update": "Обновления платформы",
  "weekly-task": "Задание недели",
  "daily-quote": "Цитата дня",
  "mentor-letter": "Письмо наставника",
  "student-online": "Ученик онлайн",
  submitted: "Сдано на проверку",
  "guide-read": "Ученик открыл методичку",
  "new-task": "Новое задание",
  "task-accepted": "Задание принято",
  "task-revision": "Задание на доработке",
  "custom-mail": "Своя рассылка",
};

export function emailTypeLabel(type: string): string {
  return EMAIL_TYPE_LABEL[type] ?? type;
}
