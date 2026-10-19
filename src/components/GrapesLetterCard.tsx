"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function GrapesLetterCard({
  letter,
  label,
  children,
}: {
  letter: string;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[16px] p-3" style={{ background: "var(--soft)" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left text-[12.5px] font-semibold"
      >
        <span className="grid h-5 w-5 place-items-center rounded-[14px] bg-white text-[11px] font-bold">{letter}</span>
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronDown
          size={14}
          style={{ color: "var(--faded)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}
        />
      </button>
      <div className="mt-1.5" style={{ display: open ? "block" : "none" }}>
        {children}
      </div>
    </div>
  );
}
