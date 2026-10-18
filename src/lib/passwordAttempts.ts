/**
 * Простой ограничитель попыток проверить текущий пароль.
 * Живёт в памяти процесса: сбрасывается при перезапуске и не общий
 * для нескольких инстансов. Для одной студии этого достаточно.
 */

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

type AttemptState = {
  count: number;
  windowStart: number;
  lockedUntil: number;
};

// globalThis, а не переменная модуля: в dev Next может поднять этот файл
// вторым экземпляром, и счётчик попыток иначе обнуляется на каждом запросе.
const globalForAttempts = globalThis as unknown as {
  passwordAttempts?: Map<string, AttemptState>;
};
const attempts = globalForAttempts.passwordAttempts ?? new Map<string, AttemptState>();
globalForAttempts.passwordAttempts = attempts;

function fresh(now: number): AttemptState {
  return { count: 0, windowStart: now, lockedUntil: 0 };
}

function current(userId: string, now: number): AttemptState {
  const existing = attempts.get(userId);
  if (!existing) return fresh(now);
  if (existing.lockedUntil && existing.lockedUntil <= now) {
    attempts.delete(userId);
    return fresh(now);
  }
  if (!existing.lockedUntil && now - existing.windowStart > LOCK_MS) {
    attempts.delete(userId);
    return fresh(now);
  }
  return existing;
}

/** Текст ошибки, если проверка текущего пароля сейчас закрыта. */
export function passwordAttemptLockMessage(userId: string, now = Date.now()): string | null {
  const state = current(userId, now);
  if (state.lockedUntil > now) {
    return "Слишком много попыток. Подождите 15 минут и попробуйте снова.";
  }
  return null;
}

/** Учитывает неверный текущий пароль. Возвращает сообщение, если попытки кончились. */
export function registerFailedPasswordAttempt(userId: string, now = Date.now()): string | null {
  const state = current(userId, now);
  if (state.lockedUntil > now) {
    return "Слишком много попыток. Подождите 15 минут и попробуйте снова.";
  }
  state.count += 1;
  if (state.count >= MAX_FAILURES) {
    state.lockedUntil = now + LOCK_MS;
    state.count = 0;
    attempts.set(userId, state);
    return "Слишком много попыток. Подождите 15 минут и попробуйте снова.";
  }
  attempts.set(userId, state);
  return null;
}

export function clearPasswordAttempts(userId: string) {
  attempts.delete(userId);
}
