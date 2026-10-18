import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: "white" | "soft";
  children: ReactNode;
}

export function Card({ surface = "white", className = "", style, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[24px] px-5 py-4 ${className}`}
      style={{
        background: surface === "white" ? "#fff" : "var(--soft)",
        border: surface === "white" ? "1px solid var(--border)" : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function Kpi({
  icon: Icon,
  iconBg,
  iconColor,
  num,
  label,
  tone = "soft",
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  iconBg: string;
  iconColor: string;
  num: number | string;
  label: string;
  tone?: "deep" | "soft";
}) {
  const deep = tone === "deep";
  return (
    <div
      className="rounded-[20px] px-5 py-3.5"
      style={{ flex: "1 1 140px", minWidth: 140, background: deep ? "var(--deep)" : iconBg, color: deep ? "#fff" : "var(--ink)" }}
    >
      <div className="flex items-center gap-2 text-[13px]" style={{ color: deep ? "rgba(255,255,255,0.7)" : "var(--muted)" }}>
        <Icon size={15} color={deep ? "#fff" : iconColor} />
        {label}
      </div>
      <div className="mt-1 text-[28px] font-semibold tracking-tight leading-none">{num}</div>
    </div>
  );
}
