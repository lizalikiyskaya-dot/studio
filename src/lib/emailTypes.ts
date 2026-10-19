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
  "platform-update": "Обновления платформы",
};

export function emailTypeLabel(type: string): string {
  return EMAIL_TYPE_LABEL[type] ?? type;
}
