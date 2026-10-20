let shared: AudioContext | null = null;
let pending = 0;

function audioContext() {
  const Ctx = window.AudioContext
    ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!shared) shared = new Ctx();
  return shared;
}

function tone(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(740, now);
  osc.frequency.exponentialRampToValueAtTime(520, now + 0.16);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.34);
}

function flush() {
  if (!shared || shared.state !== "running" || pending <= 0) return;
  const times = Math.min(pending, 3);
  pending = 0;
  for (let i = 0; i < times; i++) window.setTimeout(() => tone(shared!), i * 260);
}

/** Жест пользователя снимает запрет автовоспроизведения и доигрывает ожидавшие сигналы. */
export function primeNoteChime() {
  const ctx = audioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume().then(flush);
  else flush();
}

/** Один тихий сигнал на каждое новое чужое событие. Пока браузер молчит — копим, не сыпем пачкой при загрузке. */
export function queueNoteChimes(count: number) {
  if (count <= 0) return;
  pending += count;
  const ctx = audioContext();
  if (ctx && ctx.state === "running") flush();
}
