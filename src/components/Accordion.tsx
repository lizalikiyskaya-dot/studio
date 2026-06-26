"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function Accordion({
  title,
  defaultOpen,
  headerExtra,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <div
      className="rounded-md mb-3 overflow-hidden"
      style={{ border: "1px solid var(--rule)", background: open ? "#fff" : "#FAFAF9" }}
    >
      <div
        onClick={() => setOpen((v) => !v)}
        className="heading w-full flex items-center justify-between gap-3 px-4 py-3 text-left font-semibold text-[14.5px] cursor-pointer"
      >
        <span className="flex-1 min-w-0">{title}</span>
        {headerExtra}
        <span
          className="flex-shrink-0"
          style={{ color: "var(--faded)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}
        >
          <ChevronDown size={15} />
        </span>
      </div>
      <div
        className="px-4 pb-5 pt-1 border-t"
        style={{ borderColor: "var(--rule)", display: open ? "block" : "none" }}
      >
        {children}
      </div>
    </div>
  );
}
