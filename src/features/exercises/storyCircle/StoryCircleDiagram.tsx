import { STORY_CIRCLE_STEPS } from "./steps";

const POINTS: { x: number; y: number; labelX: number; labelY: number; anchor: "start" | "middle" | "end" }[] = [
  { x: 170, y: 45, labelX: 170, labelY: 22, anchor: "middle" },
  { x: 257, y: 82, labelX: 282, labelY: 72, anchor: "start" },
  { x: 295, y: 170, labelX: 322, labelY: 170, anchor: "start" },
  { x: 257, y: 257, labelX: 282, labelY: 278, anchor: "start" },
  { x: 170, y: 295, labelX: 170, labelY: 322, anchor: "middle" },
  { x: 82, y: 257, labelX: 58, labelY: 278, anchor: "end" },
  { x: 45, y: 170, labelX: 18, labelY: 170, anchor: "end" },
  { x: 82, y: 82, labelX: 58, labelY: 72, anchor: "end" },
];

export default function StoryCircleDiagram({ activeStep }: { activeStep?: number }) {
  return (
    <svg viewBox="-40 -25 420 390" className="w-full max-w-[420px] mx-auto block">
      <circle cx={170} cy={170} r={125} fill="none" stroke="var(--rule)" strokeWidth={1.5} />
      <line x1={45} y1={170} x2={295} y2={170} stroke="var(--rule)" strokeWidth={1} strokeDasharray="4 4" />
      <text x={170} y={166} textAnchor="middle" className="font-mono-label" style={{ fontSize: 8, fill: "var(--faded)" }}>
        известный мир
      </text>
      <text x={170} y={180} textAnchor="middle" className="font-mono-label" style={{ fontSize: 8, fill: "var(--faded)" }}>
        неизвестный мир
      </text>
      {STORY_CIRCLE_STEPS.map((step, i) => {
        const p = POINTS[i];
        const isActive = activeStep === step.n;
        return (
          <g key={step.key}>
            <circle
              cx={p.x}
              cy={p.y}
              r={15}
              fill={isActive ? "var(--wine)" : "var(--paper-light)"}
              stroke="var(--wine)"
              strokeWidth={1.5}
            />
            <text
              x={p.x}
              y={p.y + 4}
              textAnchor="middle"
              className="heading"
              style={{ fontSize: 13, fontWeight: 700, fill: isActive ? "#fff" : "var(--wine)" }}
            >
              {step.n}
            </text>
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor={p.anchor}
              className="font-mono-label"
              style={{ fontSize: 11, fill: "var(--ink-soft)" }}
            >
              {step.short}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
