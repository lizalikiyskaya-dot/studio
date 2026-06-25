"use client";

import { useState } from "react";

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
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b py-1.5 pr-14 text-[15px] outline-none bg-transparent"
        style={{ borderColor: "var(--rule)" }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-[12px]"
        style={{ color: "var(--faded)" }}
      >
        {visible ? "скрыть" : "показать"}
      </button>
    </div>
  );
}
