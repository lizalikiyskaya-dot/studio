"use client";

import { ChevronDown } from "lucide-react";

export default function PillSelect({
  className,
  style,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="pill-select-wrap" style={style}>
      <select {...props} className={className ? `pill-select ${className}` : "pill-select"}>
        {children}
      </select>
      <ChevronDown className="pill-select-chevron" size={15} aria-hidden />
    </span>
  );
}
