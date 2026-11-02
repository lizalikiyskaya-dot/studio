/**
 * Автоматические письма ученику. Письма наставнику этот список не трогает.
 * Пароль и заявка остаются: без них нельзя войти и подтвердить регистрацию.
 * Свои рассылки наставника (письмо, обновление платформы) тоже остаются.
 */
export const STUDENT_MAIL_KEPT = [
  "daily-quote",
  "weekly-task",
  "task-accepted",
  "new-task",
  "task-revision",
  "mentor-edit",
] as const;

export const STUDENT_MAIL_ACCOUNT = ["password", "registration"] as const;

export const STUDENT_MAIL_STOPPED = ["payment", "deadline", "note-reminder", "guide", "approved"] as const;

/** Не чаще одного письма со сводкой правок. Пустая сводка не уходит. */
export const MENTOR_EDIT_GAP_MS = 24 * 60 * 60 * 1000;

export function studentMailStopped(type: string): boolean {
  return (STUDENT_MAIL_STOPPED as readonly string[]).includes(type);
}
