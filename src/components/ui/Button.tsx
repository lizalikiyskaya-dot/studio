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
  primary: { background: "var(--y)", color: "var(--ink)", border: "none" },
  secondary: { background: "#fff", color: "var(--ink)", border: "1.5px solid var(--border)" },
  success: { background: "var(--sage-bright)", color: "#fff", border: "none" },
  "success-outline": { background: "transparent", color: "var(--sage)", border: "1px solid var(--sage)" },
  neutral: { background: "var(--soft)", color: "var(--ink)", border: "none" },
  ghost: { background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" },
  dashed: { background: "transparent", color: "var(--muted)", border: "1.5px dashed #dadada" },
  "dashed-sage": { background: "transparent", color: "var(--sage)", border: "1.5px dashed var(--sage)" },
  gold: { background: "var(--y)", color: "var(--ink)", border: "none" },
  "gold-outline": { background: "#fff", color: "var(--vi)", border: "1.5px solid var(--v)" },
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "text-[13.5px] px-3.5 h-8 font-medium",
  md: "text-[14.5px] px-5 h-11 font-semibold",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", pill = true, className = "", style, children, ...props }: ButtonProps) {
  return (
    <button
      className={`${pill ? "rounded-full" : "rounded-[14px]"} inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${SIZE_CLASS[size]} ${className}`}
      style={{ ...VARIANT_STYLE[variant], ...style }}
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
  title?: string;
  children: ReactNode;
}

export function LinkButton({ variant = "primary", size = "md", pill = true, className = "", style, title, children, ...props }: LinkButtonProps) {
  return (
    <Link
      className={`${pill ? "rounded-full" : "rounded-[14px]"} inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${SIZE_CLASS[size]} ${className}`}
      style={{ ...VARIANT_STYLE[variant], ...style }}
      title={title}
      {...props}
    >
      {children}
    </Link>
  );
}
