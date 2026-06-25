"use client";

import { useEffect, useRef } from "react";

function resize(el: HTMLTextAreaElement) {
  if (el.offsetParent === null) return; // hidden (display:none) — scrollHeight would read 0
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function AutoGrowTextarea({
  defaultValue,
  onBlur,
  className,
  placeholder,
  style,
}: {
  defaultValue: string;
  onBlur: (value: string) => void;
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    resize(el);

    // Custom web fonts can swap in after the initial measurement, changing
    // line height/character width — re-measure once they're loaded.
    document.fonts?.ready.then(() => resize(el));

    // If this field starts out inside a collapsed accordion/subtab
    // (display:none), scrollHeight reads 0 — re-measure once it becomes
    // visible instead of staying stuck at that height.
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) resize(el);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      defaultValue={defaultValue}
      placeholder={placeholder}
      rows={1}
      onInput={(e) => resize(e.currentTarget)}
      onBlur={(e) => onBlur(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className={className}
      style={{ resize: "none", overflow: "hidden", display: "block", ...style }}
    />
  );
}
