"use client";

import { useEffect, useRef } from "react";

function resize(el: HTMLTextAreaElement) {
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
    if (ref.current) resize(ref.current);
  }, []);

  return (
    <textarea
      ref={ref}
      defaultValue={defaultValue}
      placeholder={placeholder}
      rows={1}
      onInput={(e) => resize(e.currentTarget)}
      onBlur={(e) => onBlur(e.target.value)}
      className={className}
      style={{ resize: "none", overflow: "hidden", display: "block", ...style }}
    />
  );
}
