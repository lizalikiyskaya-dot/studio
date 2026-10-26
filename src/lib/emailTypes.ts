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
  "platform-update": "Обновления платформы",
  "weekly-task": "Задание недели",
  "daily-quote": "Цитата дня",
  "mentor-letter": "Письмо наставника",
  "student-online": "Ученик онлайн",
  submitted: "Сдано на проверку",
  "new-task": "Новое задание",
};

export function emailTypeLabel(type: string): string {
  return EMAIL_TYPE_LABEL[type] ?? type;
}
