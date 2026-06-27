import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  surface?: "white" | "soft";
  children: ReactNode;
}

export function Card({ surface = "white", className = "", style, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[14px] px-4 py-3.5 ${className}`}
      style={{
        background: surface === "white" ? "var(--paper-light)" : "var(--bg-surface-2)",
        border: surface === "white" ? "1px solid var(--rule)" : undefined,
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
}: {
  icon: React.ComponentType<{ size?: number }>;
  iconBg: string;
  iconColor: string;
  num: number | string;
  label: string;
}) {
  return (
    <Card surface="soft" className="flex items-center gap-3" style={{ flex: 1, minWidth: 140 }}>
      <div
        className="flex items-center justify-center rounded-[10px] flex-shrink-0"
        style={{ width: 36, height: 36, background: iconBg, color: iconColor }}
      >
        <Icon size={17} />
      </div>
      <div>
        <div className="heading text-[19px] leading-none">{num}</div>
        <div className="text-[11.5px]" style={{ color: "var(--faded)" }}>
          {label}
        </div>
      </div>
    </Card>
  );
}
