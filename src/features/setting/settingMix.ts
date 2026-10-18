export type MixKey = "конфликт" | "магнит" | "манифест" | "фильтр";

export type SettingShares = {
  manifest: number;
  filter: number;
  conflict: number;
  magnet: number;
};

export const MIX_META: Record<
  keyof SettingShares,
  { key: MixKey; label: string; gen: string; color: string; bg: string }
> = {
  conflict: { key: "конфликт", label: "Конфликт", gen: "Конфликта", color: "#E0592A", bg: "#FDE3DA" },
  manifest: { key: "манифест", label: "Манифест", gen: "Манифеста", color: "#6553E8", bg: "#E6E2FF" },
  magnet: { key: "магнит", label: "Магнит", gen: "Магнита", color: "#2FB083", bg: "#D5F3E7" },
  filter: { key: "фильтр", label: "Фильтр", gen: "Фильтра", color: "#E3A21A", bg: "#FFF5CC" },
};

const PURE: Record<MixKey, { gen: string; text: string }> = {
  конфликт: { gen: "конфликта", text: "Враждебный, логичный мир, который сам генерирует испытания. Герой противостоит среде с закреплёнными правилами и последствиями." },
  магнит: { gen: "магнита", text: "Понятный и притягательный мир для эскапизма. Компенсирует потребности аудитории и легко копируется в реальность (мерч)." },
  манифест: { gen: "манифеста", text: "Мир — иллюстрация идеи. Вся его логика подчинена теории автора, а главный приём — аллегория." },
  фильтр: { gen: "фильтра", text: "Мир — эстетическое высказывание. Держится на ассоциациях, метафорах и настроении, а не на объяснениях." },
};

const PAIRS: Record<string, string> = {
  "конфликт|магнит": "Общая ось — логика: оба мира держатся на чётких правилах, но по-разному влияют на читателя. Строгий мир, где опасность соседствует с желанием в нём остаться.",
  "манифест|фильтр": "Общая ось — интуиция: оба мира построены на ассоциациях, а не на жёстких правилах. Идея автора растворена в эстетике.",
  "магнит|фильтр": "Общая ось — комфорт: в обоих мирах хочется остаться. Один держит понятностью, другой — атмосферой.",
  "конфликт|манифест": "Общая ось — дискомфорт: оба мира давят на героя. На их пересечении живёт антиутопия: мир и противостоит герою, и иллюстрирует тезис автора.",
  "конфликт|фильтр": "Противоположные углы квадранта вместе: мир одновременно давит правилами и держится на настроении. Опасность ощущается, но не объясняется до конца.",
  "манифест|магнит": "Противоположные углы вместе: идея автора живёт в мире, куда хочется вернуться. Аллегория притягивает, а не отталкивает.",
};

const NEAR = 15;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function quadType(x: number, y: number): MixKey {
  if (y < 50) return x < 50 ? "конфликт" : "магнит";
  return x < 50 ? "манифест" : "фильтр";
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pairKey(a: string, b: string) {
  return PAIRS[`${a}|${b}`] ? `${a}|${b}` : `${b}|${a}`;
}

export type PointResult = { verdict: string; mixes: { key: string; pct: number }[]; meaning: string };

/** Старая точка на квадранте → доли, как они считались до ползунков. */
export function computeResult(rawX: number, rawY: number): PointResult {
  const x = clamp(rawX, 3, 97);
  const y = clamp(rawY, 3, 97);
  const adx = Math.abs(x - 50);
  const ady = Math.abs(y - 50);
  const nearV = adx < NEAR;
  const nearH = ady < NEAR;
  const main = quadType(x, y);

  if (nearV && nearH) {
    const c = x / 100;
    const d = 1 - c;
    const lg = (100 - y) / 100;
    const it = 1 - lg;
    const w = [
      { key: "конфликт", p: lg * d },
      { key: "магнит", p: lg * c },
      { key: "манифест", p: it * d },
      { key: "фильтр", p: it * c },
    ].sort((a, b) => b.p - a.p);
    const tot = w.reduce((s, m) => s + m.p, 0);
    const pcts = w.map((m) => Math.round((m.p / tot) * 100));
    pcts[0] += 100 - pcts.reduce((s, v) => s + v, 0);
    return {
      verdict: "Смешанный сеттинг: все четыре типа",
      mixes: w.map((m, i) => ({ key: m.key, pct: pcts[i] })),
      meaning: "Редкий случай: мир держит баланс всех четырёх типов сразу. Решите, какая грань у вас ведущая.",
    };
  }

  let secondary: MixKey | null = null;
  let dist = 0;
  if (nearV) {
    secondary = y < 50 ? (main === "конфликт" ? "магнит" : "конфликт") : main === "манифест" ? "фильтр" : "манифест";
    dist = adx;
  } else if (nearH) {
    secondary = x < 50 ? (main === "конфликт" ? "манифест" : "конфликт") : main === "магнит" ? "фильтр" : "магнит";
    dist = ady;
  }

  if (secondary) {
    const mainPct = Math.round(50 + (dist / NEAR) * 50);
    if (mainPct < 92) {
      return {
        verdict: `${cap(main)} с примесью ${PURE[secondary].gen}`,
        mixes: [
          { key: main, pct: mainPct },
          { key: secondary, pct: 100 - mainPct },
        ],
        meaning: PAIRS[pairKey(main, secondary)],
      };
    }
  }
  return { verdict: `Чистый ${main}`, mixes: [{ key: main, pct: 100 }], meaning: PURE[main].text };
}

export function clampShare(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function emptyShares(): SettingShares {
  return { manifest: 0, filter: 0, conflict: 0, magnet: 0 };
}

export function sharesFromPoint(x: number | null, y: number | null): SettingShares {
  const shares = emptyShares();
  if (x == null || y == null) return shares;
  const result = computeResult(x, y);
  for (const mix of result.mixes) {
    if (mix.key === "конфликт") shares.conflict = mix.pct;
    else if (mix.key === "магнит") shares.magnet = mix.pct;
    else if (mix.key === "манифест") shares.manifest = mix.pct;
    else if (mix.key === "фильтр") shares.filter = mix.pct;
  }
  return shares;
}

export function hasStoredShares(raw: {
  settingManifest: number | null;
  settingFilter: number | null;
  settingConflict: number | null;
  settingMagnet: number | null;
}) {
  return raw.settingManifest != null || raw.settingFilter != null || raw.settingConflict != null || raw.settingMagnet != null;
}

export function resolveShares(raw: {
  settingManifest: number | null;
  settingFilter: number | null;
  settingConflict: number | null;
  settingMagnet: number | null;
  settingMapX: number | null;
  settingMapY: number | null;
}): SettingShares {
  if (!hasStoredShares(raw)) return sharesFromPoint(raw.settingMapX, raw.settingMapY);
  return {
    manifest: raw.settingManifest ?? 0,
    filter: raw.settingFilter ?? 0,
    conflict: raw.settingConflict ?? 0,
    magnet: raw.settingMagnet ?? 0,
  };
}

export function parseShares(value: string): SettingShares | null {
  try {
    const data = JSON.parse(value) as Partial<SettingShares>;
    if (!data || typeof data !== "object") return null;
    return {
      manifest: clampShare(Number(data.manifest ?? 0)),
      filter: clampShare(Number(data.filter ?? 0)),
      conflict: clampShare(Number(data.conflict ?? 0)),
      magnet: clampShare(Number(data.magnet ?? 0)),
    };
  } catch {
    return null;
  }
}

export type ShareRow = { id: keyof SettingShares; label: string; gen: string; color: string; value: number; pct: number };

export function describeShares(shares: SettingShares): { title: string; meaning: string; rows: ShareRow[] } {
  const rows = (Object.keys(MIX_META) as (keyof SettingShares)[]).map((id) => ({
    id,
    label: MIX_META[id].label,
    gen: MIX_META[id].gen,
    color: MIX_META[id].color,
    value: clampShare(shares[id]),
    pct: 0,
  }));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const ranked = [...rows].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "ru"));
  if (total <= 0) {
    return { title: "Тип пока не задан", meaning: "Двиньте ползунки или нажмите четверть квадранта.", rows: ranked };
  }
  const positive = ranked.filter((row) => row.value > 0);
  let assigned = 0;
  positive.forEach((row, index) => {
    if (index === positive.length - 1) {
      row.pct = Math.max(0, 100 - assigned);
      return;
    }
    const share = Math.round((row.value / total) * 100);
    row.pct = Math.min(share, Math.max(0, 100 - assigned));
    assigned += row.pct;
  });
  const top = ranked[0];
  const second = ranked[1];
  if (!second || second.value === 0) {
    return { title: `Чистый ${top.label.toLowerCase()}`, meaning: PURE[MIX_META[top.id].key].text, rows };
  }
  const meaning = PAIRS[pairKey(MIX_META[top.id].key, MIX_META[second.id].key)] ?? PURE[MIX_META[top.id].key].text;
  return { title: `${top.label} с примесью ${second.gen}`, meaning, rows };
}
