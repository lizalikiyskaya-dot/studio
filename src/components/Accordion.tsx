"use client";

import { useState } from "react";

export default function Accordion({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <div
      className="rounded-md mb-3 overflow-hidden"
      style={{ border: "1px solid var(--rule)", background: open ? "#fff" : "#FAFAF9" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-[14.5px]"
      >
        <span>{title}</span>
        <span
          className="text-[12px]"
          style={{ color: "var(--faded)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 border-t" style={{ borderColor: "var(--rule)" }}>
          {children}
        </div>
      )}
    </div>
  );
}
