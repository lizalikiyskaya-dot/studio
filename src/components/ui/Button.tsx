import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link, { type LinkProps } from "next/link";

type Variant =
  | "primary"
  | "secondary"
  | "success"
  | "success-outline"
  | "neutral"
  | "ghost"
  | "dashed"
  | "dashed-sage"
  | "gold"
  | "gold-outline";

type Size = "sm" | "md";

const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary:        { background: "var(--wine)", color: "#fff", border: "1px solid var(--wine)" },
  secondary:      { background: "transparent", color: "var(--wine)", border: "1px solid var(--wine)" },
  success:        { background: "var(--sage)", color: "#fff", border: "1px solid var(--sage)" },
  "success-outline": { background: "transparent", color: "var(--sage)", border: "1px solid var(--sage)" },
  neutral:        { background: "var(--neutral-active)", color: "var(--ink)", border: "1px solid var(--neutral-active)" },
  ghost:          { background: "transparent", color: "var(--faded)", border: "1px solid var(--rule)" },
  dashed:         { background: "transparent", color: "var(--wine)", border: "1px dashed var(--wine)" },
  "dashed-sage":  { background: "transparent", color: "var(--sage)", border: "1px dashed var(--sage)" },
  gold:           { background: "var(--gold)", color: "#fff", border: "1px solid var(--gold)" },
  "gold-outline": { background: "transparent", color: "var(--gold)", border: "1px solid var(--gold)" },
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "text-[12.5px] px-2.5 py-1",
  md: "text-[13px] px-3 py-1.5",
};

function buttonStyle(variant: Variant) {
  return VARIANT_STYLE[variant];
}

function shapeClass(pill?: boolean) {
  return pill ? "rounded-full" : "rounded-[10px]";
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", pill, className = "", style, children, ...props }: ButtonProps) {
  return (
    <button
      className={`${shapeClass(pill)} inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${SIZE_CLASS[size]} ${className}`}
      style={{ ...buttonStyle(variant), ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

interface LinkButtonProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export function LinkButton({ variant = "primary", size = "md", pill, className = "", style, children, ...props }: LinkButtonProps) {
  return (
    <Link
      className={`${shapeClass(pill)} inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${SIZE_CLASS[size]} ${className}`}
      style={{ ...buttonStyle(variant), ...style }}
      {...props}
    >
      {children}
    </Link>
  );
}
