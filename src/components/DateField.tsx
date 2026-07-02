"use client";

import { CalendarDays } from "lucide-react";

// Stored value is ISO (YYYY-MM-DD); shown to the user as DD.MM.YYYY.
function toDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/**
 * Date input that always DISPLAYS dd.mm.yyyy regardless of browser locale
 * (native <input type="date"> follows the OS locale, which we can't force),
 * while keeping the real native calendar picker. A transparent date input
 * overlays the formatted text; clicking it opens the picker.
 */
export default function DateField({
  value,
  onChange,
  className,
  style,
}: {
  value: string;
  onChange: (isoValue: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className ?? ""}`} style={style}>
      <span
        className="text-[13px] font-mono-label"
        style={{ color: value ? "var(--ink)" : "var(--faded)" }}
      >
        {value ? toDisplay(value) : "дд.мм.гггг"}
      </span>
      <CalendarDays size={13} style={{ color: "var(--faded)", flexShrink: 0 }} />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.currentTarget.showPicker?.()}
        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        style={{ colorScheme: "light" }}
        aria-label="Дата"
      />
    </div>
  );
}
