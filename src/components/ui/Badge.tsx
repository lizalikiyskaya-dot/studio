import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "success" | "danger" | "warning";
type Fill = "outline" | "solid" | "soft";

const TONE_SOFT: Record<Tone, { background: string; color: string }> = {
  neutral: { background: "var(--soft)", color: "var(--ink2)" },
  success: { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" },
  danger: { background: "var(--pill-red-bg)", color: "var(--pill-red-fg)" },
  warning: { background: "var(--pill-or-bg)", color: "var(--pill-or-fg)" },
};

function badgeStyle(tone: Tone, fill: Fill): React.CSSProperties {
  const soft = TONE_SOFT[tone];
  if (fill === "solid") {
    return { background: soft.color, color: "#fff", border: "none" };
  }
  return { background: soft.background, color: soft.color, border: "none" };
}

interface BadgeProps {
  tone?: Tone;
  fill?: Fill;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", fill = "soft", className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}
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

export function BadgeButton({ tone = "neutral", fill = "soft", className = "", children, ...props }: BadgeButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${className}`}
      style={badgeStyle(tone, fill)}
      {...props}
    >
      {children}
    </button>
  );
}
