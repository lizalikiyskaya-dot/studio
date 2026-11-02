/** Не чаще одного письма в 2 минуты на аккаунт. */
export const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/** Сколько ещё ждать повторную ссылку. 0, если пауза уже прошла. */
export function cooldownRemainingMs(createdAt: Date, now = Date.now()): number {
  return Math.max(0, RESEND_COOLDOWN_MS - (now - createdAt.getTime()));
}

/** Коротко, для фразы «осталось …». */
export function formatResetWait(retryAfterMs: number): string {
  const totalSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const minutes = Math.ceil(totalSec / 60);
  if (minutes >= 2) return "около 2 минут";
  if (totalSec >= 45) return "около минуты";
  return "меньше минуты";
}
