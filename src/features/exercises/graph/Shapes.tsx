"use client";

import { circlePositions, linePath, type Point } from "./moves";

export function PointChart({
  points,
  filled,
  active,
  labels,
  onPick,
  height = 148,
}: {
  points: Point[];
  filled: boolean[];
  active: number | null;
  labels: string[];
  onPick: (index: number) => void;
  height?: number;
}) {
  const path = linePath(points);

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
      </svg>
      {points.map((point, index) => {
        const on = filled[index];
        const current = active === index;
        return (
          <button
            key={index}
            type="button"
            onClick={() => onPick(index)}
            aria-label={`${index + 1}. ${labels[index] ?? ""}`}
            aria-current={current ? "true" : undefined}
            className="absolute flex items-center justify-center rounded-full text-[13px] font-semibold"
            style={{
              width: 32,
              height: 32,
              left: `${point.x}%`,
              top: `${point.y}%`,
              transform: "translate(-50%, -50%)",
              background: on ? "var(--y)" : "#fff",
              color: "var(--ink)",
              border: current ? "2px solid var(--ink)" : "1.5px solid var(--border)",
              boxShadow: current ? "0 0 0 3px var(--y)" : undefined,
            }}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}

export function CircleChart({
  filled,
  active,
  labels,
  onPick,
}: {
  filled: boolean[];
  active: number | null;
  labels: string[];
  onPick: (index: number) => void;
}) {
  const count = labels.length;
  const points = circlePositions(count);
  return (
    <div className="relative mx-auto" style={{ width: 232, height: 232 }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="50" cy="50" r="36" fill="none" stroke="var(--border)" strokeWidth="1.25" />
        <line x1="14" y1="50" x2="86" y2="50" stroke="var(--border)" strokeDasharray="2 2" strokeWidth="0.6" />
        <text x="50" y="47" textAnchor="middle" fill="var(--faded)" fontSize="4.2">
          известный
        </text>
        <text x="50" y="55" textAnchor="middle" fill="var(--faded)" fontSize="4.2">
          неизвестный
        </text>
      </svg>
      {Array.from({ length: count }, (_, index) => {
        const point = points[index];
        const on = filled[index];
        const current = active === index;
        return (
          <button
            key={labels[index]}
            type="button"
            onClick={() => onPick(index)}
            aria-label={`${index + 1}. ${labels[index]}`}
            aria-current={current ? "true" : undefined}
            className="absolute flex items-center justify-center rounded-full text-[13px] font-semibold"
            style={{
              width: 32,
              height: 32,
              left: `${point.x}%`,
              top: `${point.y}%`,
              transform: "translate(-50%, -50%)",
              background: on ? "var(--y)" : "#fff",
              color: "var(--ink)",
              border: current ? "2px solid var(--ink)" : "1.5px solid var(--border)",
              boxShadow: current ? "0 0 0 3px var(--y)" : undefined,
            }}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
