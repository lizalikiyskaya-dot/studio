import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "success" | "danger" | "warning";
type Fill = "outline" | "solid";

const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--faded)",
  success: "var(--sage)",
  danger: "var(--wine)",
  warning: "var(--wine)",
};

function badgeStyle(tone: Tone, fill: Fill): React.CSSProperties {
  const color = TONE_COLOR[tone];
  if (fill === "solid") {
    return { background: color, color: "#fff", border: `1px solid ${color}` };
  }
  return { background: "#fff", color, border: `1px solid ${color}` };
}

interface BadgeProps {
  tone?: Tone;
  fill?: Fill;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", fill = "outline", className = "", children }: BadgeProps) {
  return (
    <span
      className={`font-mono-label inline-flex items-center gap-1.5 text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}
      style={badgeStyle(tone, fill)}
    >
      {children}
    </span>
  );
}

interface BadgeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  fill?: Fill;
  className?: string;
  children: ReactNode;
}

export function BadgeButton({ tone = "neutral", fill = "outline", className = "", children, ...props }: BadgeButtonProps) {
  return (
    <button
      className={`font-mono-label inline-flex items-center gap-1.5 text-[10.5px] px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}
      style={badgeStyle(tone, fill)}
      {...props}
    >
      {children}
    </button>
  );
}
