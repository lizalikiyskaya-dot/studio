import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link, { type LinkProps } from "next/link";

type Variant = "primary" | "secondary" | "success" | "success-outline" | "ghost";
type Size = "sm" | "md";

const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--wine)", color: "#fff", border: "1px solid var(--wine)" },
  secondary: { background: "transparent", color: "var(--wine)", border: "1px solid var(--wine)" },
  success: { background: "var(--sage)", color: "#fff", border: "1px solid var(--sage)" },
  "success-outline": { background: "transparent", color: "var(--sage)", border: "1px solid var(--sage)" },
  ghost: { background: "transparent", color: "var(--faded)", border: "1px solid var(--rule)" },
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "text-[12.5px] px-2.5 py-1",
  md: "text-[13px] px-3 py-1.5",
};

function buttonStyle(variant: Variant) {
  return VARIANT_STYLE[variant];
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", style, children, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-[10px] inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${SIZE_CLASS[size]} ${className}`}
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
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export function LinkButton({ variant = "primary", size = "md", className = "", style, children, ...props }: LinkButtonProps) {
  return (
    <Link
      className={`rounded-[10px] inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${SIZE_CLASS[size]} ${className}`}
      style={{ ...buttonStyle(variant), ...style }}
      {...props}
    >
      {children}
    </Link>
  );
}
