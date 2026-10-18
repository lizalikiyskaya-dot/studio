"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({
  value,
  onChange,
  required,
  minLength,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="fld-wrap relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="fld pr-28"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 text-[13px]"
        style={{ color: "var(--muted)" }}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        {visible ? "скрыть" : "показать"}
      </button>
    </div>
  );
}
