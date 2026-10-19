/**
 * Рассылка «Задание недели» по субботам.
 *
 * Сейчас выключена и ниоткуда не вызывается. Письма не отправляет.
 * Следующий PR подставит шаблон письма и включит субботнюю отправку.
 * Не подключать к крону и не импортировать из действий кабинета, пока
 * WEEKLY_MAILING_ENABLED не станет true в том PR.
 */
export const WEEKLY_MAILING_ENABLED = false;

export function renderWeeklyTaskLetter(): null {
  if (WEEKLY_MAILING_ENABLED) return null;
  return null;
}
