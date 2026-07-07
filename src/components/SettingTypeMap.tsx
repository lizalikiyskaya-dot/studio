"use client";

import { useRef, useState } from "react";

const NEAR = 15;

type Key = "конфликт" | "магнит" | "манифест" | "фильтр";

const PURE: Record<Key, { gen: string; text: string }> = {
  "конфликт": { gen: "конфликта", text: "Враждебный, логичный мир, который сам генерирует испытания. Герой противостоит среде с закреплёнными правилами и последствиями." },
  "магнит": { gen: "магнита", text: "Понятный и притягательный мир для эскапизма. Компенсирует потребности аудитории и легко копируется в реальность (мерч)." },
  "манифест": { gen: "манифеста", text: "Мир — иллюстрация идеи. Вся его логика подчинена теории автора, а главный приём — аллегория." },
  "фильтр": { gen: "фильтра", text: "Мир — эстетическое высказывание. Держится на ассоциациях, метафорах и настроении, а не на объяснениях." },
};

const PAIRS: Record<string, string> = {
  "конфликт|магнит": "Общая ось — логика (hardworldbuilding): оба мира держатся на чётких правилах, но по-разному влияют на читателя. Строгий, продуманный мир, где опасность соседствует с желанием в нём остаться — как арена «Голодных игр» или Хогвартс с его угрозами.",
  "манифест|фильтр": "Общая ось — интуиция (softworldbuilding): оба мира построены на ассоциациях, а не на жёстких правилах. Идея автора растворена в эстетике: сеттинг одновременно доказывает мысль и создаёт настроение — территория магического реализма.",
  "магнит|фильтр": "Общая ось — комфорт: в обоих мирах хочется остаться. Один держит понятностью и геймификацией, другой — атмосферой и красотой. Уютный, обволакивающий сеттинг, куда сбегают и ради правил игры, и ради ощущения.",
  "конфликт|манифест": "Общая ось — дискомфорт: оба мира давят на героя. Один враждебен как среда, другой — как доказываемая идея. На их пересечении живёт классическая антиутопия: мир и противостоит герою, и иллюстрирует тезис автора.",
};

const ALL4 = "Редкий случай: мир держит баланс всех четырёх типов сразу — он объясняет идею, создаёт настроение, притягивает и противостоит. Такой сеттинг легко теряет фокус, поэтому решите, какая грань у вас ведущая.";

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function quadType(x: number, y: number): Key {
  if (y < 50) return x < 50 ? "конфликт" : "магнит";
  return x < 50 ? "манифест" : "фильтр";
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function pairKey(a: string, b: string) { return PAIRS[`${a}|${b}`] ? `${a}|${b}` : `${b}|${a}`; }

type Result = { verdict: string; mixes: { key: string; pct: number }[]; meaning: string };

function computeResult(rawX: number, rawY: number): Result {
  const x = clamp(rawX, 3, 97), y = clamp(rawY, 3, 97);
  const adx = Math.abs(x - 50), ady = Math.abs(y - 50);
  const nearV = adx < NEAR, nearH = ady < NEAR;
  const main = quadType(x, y);

  if (nearV && nearH) {
    const c = x / 100, d = 1 - c, lg = (100 - y) / 100, it = 1 - lg;
    const w = [
      { key: "конфликт", p: lg * d }, { key: "магнит", p: lg * c },
      { key: "манифест", p: it * d }, { key: "фильтр", p: it * c },
    ].sort((a, b) => b.p - a.p);
    const tot = w.reduce((s, m) => s + m.p, 0);
    const pcts = w.map((m) => Math.round((m.p / tot) * 100));
    pcts[0] += 100 - pcts.reduce((s, v) => s + v, 0);
    return { verdict: "Смешанный сеттинг: все четыре типа", mixes: w.map((m, i) => ({ key: m.key, pct: pcts[i] })), meaning: ALL4 };
  }

  let secondary: Key | null = null, dist = 0;
  if (nearV) {
    secondary = y < 50 ? (main === "конфликт" ? "магнит" : "конфликт") : (main === "манифест" ? "фильтр" : "манифест");
    dist = adx;
  } else if (nearH) {
    secondary = x < 50 ? (main === "конфликт" ? "манифест" : "конфликт") : (main === "магнит" ? "фильтр" : "магнит");
    dist = ady;
  }

  if (secondary) {
    const mainPct = Math.round(50 + (dist / NEAR) * 50);
    if (mainPct < 92) {
      return { verdict: `${cap(main)} с примесью ${PURE[secondary].gen}`, mixes: [{ key: main, pct: mainPct }, { key: secondary, pct: 100 - mainPct }], meaning: PAIRS[pairKey(main, secondary)] };
    }
  }
  return { verdict: `Чистый ${main}`, mixes: [{ key: main, pct: 100 }], meaning: PURE[main].text };
}

const AXIS = "text-center text-[11px] tracking-[1.6px] uppercase";
const AXIS_STYLE = { color: "#8E8779" } as const;

export default function SettingTypeMap({
  x,
  y,
  onSave,
  readOnly,
}: {
  x: number | null;
  y: number | null;
  onSave?: (x: number, y: number) => void;
  readOnly?: boolean;
}) {
  const [pos, setPos] = useState({ x: x ?? 50, y: y ?? 50 });
  const [placed, setPlaced] = useState(x != null && y != null);
  const mapRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  const draggingRef = useRef(false);

  function moveTo(clientX: number, clientY: number) {
    const r = mapRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = clamp(((clientX - r.left) / r.width) * 100, 3, 97);
    const ny = clamp(((clientY - r.top) / r.height) * 100, 3, 97);
    posRef.current = { x: nx, y: ny };
    setPos(posRef.current);
    setPlaced(true);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (readOnly) return;
    draggingRef.current = true;
    moveTo(e.clientX, e.clientY);
    const onMove = (me: PointerEvent) => { if (draggingRef.current) moveTo(me.clientX, me.clientY); };
    const onUp = () => {
      draggingRef.current = false;
      onSave?.(Math.round(posRef.current.x), Math.round(posRef.current.y));
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    e.preventDefault();
  }

  const result = placed ? computeResult(pos.x, pos.y) : null;

  return (
    <div style={{ maxWidth: 480 }}>
      {!readOnly && (
        <div className="text-[12.5px] mb-3" style={{ color: "var(--faded)" }}>
          Перетащите маркер по карте
        </div>
      )}

      <div className={AXIS} style={AXIS_STYLE}>логика · hardworldbuilding</div>
      <div className="flex items-stretch gap-2 my-2">
        <div className="flex items-center">
          <span className="text-[11px] tracking-[1.4px] uppercase" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: "#8E8779" }}>дискомфорт</span>
        </div>

        <div
          ref={mapRef}
          onPointerDown={onPointerDown}
          className="relative flex-1 rounded-[12px] overflow-hidden"
          style={{ aspectRatio: "1.25", background: "#fff", border: "1px solid #E8E2D7", cursor: readOnly ? "default" : "crosshair", touchAction: "none" }}
        >
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" }}>
            <div className="p-3" style={{ background: "#F3EAD9", borderRight: "1px solid #E8E2D7", borderBottom: "1px solid #E8E2D7" }}>
              <div className="font-serif text-[15px]" style={{ color: "#93744A" }}>Конфликт</div>
              <div className="text-[10px] tracking-[1.2px] uppercase" style={{ color: "#B49B77" }}>противостоит</div>
            </div>
            <div className="p-3 text-right" style={{ background: "#E4EBF1", borderBottom: "1px solid #E8E2D7" }}>
              <div className="font-serif text-[15px]" style={{ color: "#56708A" }}>Магнит</div>
              <div className="text-[10px] tracking-[1.2px] uppercase" style={{ color: "#8399AE" }}>привлекает</div>
            </div>
            <div className="p-3 flex flex-col justify-end" style={{ background: "#E6EDE1", borderRight: "1px solid #E8E2D7" }}>
              <div className="font-serif text-[15px]" style={{ color: "#5F7A57" }}>Манифест</div>
              <div className="text-[10px] tracking-[1.2px] uppercase" style={{ color: "#8CA184" }}>объясняет</div>
            </div>
            <div className="p-3 flex flex-col justify-end text-right" style={{ background: "#F4E4E6" }}>
              <div className="font-serif text-[15px]" style={{ color: "#96545E" }}>Фильтр</div>
              <div className="text-[10px] tracking-[1.2px] uppercase" style={{ color: "#B2828A" }}>изображает</div>
            </div>
          </div>

          <div
            className="absolute flex items-center justify-center"
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`, width: 28, height: 28, margin: "-14px 0 0 -14px",
              background: "#3A3531", border: "2.5px solid #F6F3ED", borderRadius: 9, color: "#F6F3ED", fontSize: 14,
              cursor: readOnly ? "default" : "grab", opacity: placed ? 1 : 0.5,
            }}
          >
            ✦
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-[11px] tracking-[1.4px] uppercase" style={{ writingMode: "vertical-rl", color: "#8E8779" }}>комфорт</span>
        </div>
      </div>
      <div className={AXIS} style={AXIS_STYLE}>интуиция · softworldbuilding</div>

      <div className="rounded-[12px] p-4 mt-4" style={{ background: "#fff", border: "1px solid #E8E2D7" }}>
        <div className="text-[11px] tracking-[1.4px] uppercase mb-1.5" style={{ color: "#8E8779" }}>ваш сеттинг</div>
        <div className="font-serif text-[18px] mb-2.5" style={{ color: "#2E2A26" }}>
          {result ? result.verdict : "— тип пока не выбран"}
        </div>
        {result && (
          <div className="flex gap-1.5 flex-wrap">
            {result.mixes.map((m, i) => (
              <span key={m.key} className="rounded-full text-[12px]" style={{ padding: "5px 12px", background: i === 0 ? "#3A3531" : "#F1ECE2", color: i === 0 ? "#F6F3ED" : "#8E8779" }}>
                {m.key} · {m.pct}%
              </span>
            ))}
          </div>
        )}
        {result && (
          <>
            <hr className="my-3.5" style={{ border: "none", borderTop: "1px solid #E8E2D7" }} />
            <div className="text-[11px] tracking-[1.4px] uppercase mb-1.5" style={{ color: "#8E8779" }}>что это значит</div>
            <div className="text-[13px] leading-relaxed" style={{ color: "#57524B" }}>{result.meaning}</div>
          </>
        )}
      </div>
    </div>
  );
}
