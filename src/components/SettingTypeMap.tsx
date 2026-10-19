"use client";

import { useRef, useState } from "react";
import { computeResult } from "@/features/setting/settingMix";

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

const AXIS = "text-center text-[11px] tracking-[1.6px] uppercase";
const AXIS_STYLE = { color: "var(--muted)" } as const;

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
      <div className={AXIS} style={AXIS_STYLE}>логика · hardworldbuilding</div>
      <div className="flex items-stretch gap-2 my-2">
        <div className="flex items-center">
          <span className="text-[11px] tracking-[1.4px] uppercase" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", color: "var(--muted)" }}>дискомфорт</span>
        </div>

        <div
          ref={mapRef}
          onPointerDown={onPointerDown}
          className="relative flex-1 rounded-[12px] overflow-hidden"
          style={{ aspectRatio: "1.25", background: "#fff", border: "1px solid var(--line)", cursor: readOnly ? "default" : "crosshair", touchAction: "none" }}
        >
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr" }}>
            <div className="p-3" style={{ background: "#F3EAD9", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
              <div className="text-[15px] font-semibold" style={{ color: "#93744A" }}>Конфликт</div>
              <div className="text-[10px] tracking-[1.2px] uppercase" style={{ color: "#B49B77" }}>противостоит</div>
            </div>
            <div className="p-3 text-right" style={{ background: "#E4EBF1", borderBottom: "1px solid var(--line)" }}>
              <div className="text-[15px] font-semibold" style={{ color: "#56708A" }}>Магнит</div>
              <div className="text-[10px] tracking-[1.2px] uppercase" style={{ color: "#8399AE" }}>привлекает</div>
            </div>
            <div className="p-3 flex flex-col justify-end" style={{ background: "#E6EDE1", borderRight: "1px solid var(--line)" }}>
              <div className="text-[15px] font-semibold" style={{ color: "#5F7A57" }}>Манифест</div>
              <div className="text-[10px] tracking-[1.2px] uppercase" style={{ color: "#8CA184" }}>объясняет</div>
            </div>
            <div className="p-3 flex flex-col justify-end text-right" style={{ background: "#F4E4E6" }}>
              <div className="text-[15px] font-semibold" style={{ color: "#96545E" }}>Фильтр</div>
              <div className="text-[10px] tracking-[1.2px] uppercase" style={{ color: "#B2828A" }}>изображает</div>
            </div>
          </div>

          <div
            className="absolute flex items-center justify-center"
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`, width: 28, height: 28, margin: "-14px 0 0 -14px",
              background: "var(--ink)", border: "2.5px solid #fff", borderRadius: 14, color: "var(--y)", fontSize: 14,
              cursor: readOnly ? "default" : "grab", opacity: placed ? 1 : 0.5,
            }}
          >
            ✦
          </div>
        </div>

        <div className="flex items-center">
          <span className="text-[11px] tracking-[1.4px] uppercase" style={{ writingMode: "vertical-rl", color: "var(--muted)" }}>комфорт</span>
        </div>
      </div>
      <div className={AXIS} style={AXIS_STYLE}>интуиция · softworldbuilding</div>

      <div className="rounded-[12px] p-4 mt-4" style={{ background: "#fff", border: "1px solid var(--line)" }}>
        <div className="text-[11px] tracking-[1.4px] uppercase mb-1.5" style={{ color: "var(--muted)" }}>ваш сеттинг</div>
        <div className="text-[18px] font-semibold mb-2.5" style={{ color: "var(--ink)" }}>
          {result ? result.verdict : "— тип пока не выбран"}
        </div>
        {result && (
          <div className="flex gap-1.5 flex-wrap">
            {result.mixes.map((m, i) => (
              <span key={m.key} className="rounded-full text-[12px]" style={{ padding: "5px 12px", background: i === 0 ? "var(--ink)" : "var(--soft)", color: i === 0 ? "#fff" : "var(--muted)" }}>
                {m.key} · {m.pct}%
              </span>
            ))}
          </div>
        )}
        {result && (
          <>
            <hr className="my-3.5" style={{ border: "none", borderTop: "1px solid var(--line)" }} />
            <div className="text-[11px] tracking-[1.4px] uppercase mb-1.5" style={{ color: "var(--muted)" }}>что это значит</div>
            <div className="text-[13px] leading-relaxed" style={{ color: "#57524B" }}>{result.meaning}</div>
          </>
        )}
      </div>
    </div>
  );
}
