"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CollapsibleCharacterShell({
  name,
  photoUrl,
  headerExtra,
  defaultOpen,
  title,
  children,
}: {
  name: string;
  photoUrl: string | null;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <div
      className="rounded-[18px] mb-4 max-w-[760px]"
      style={{ border: "1px solid var(--rule)", background: open ? "#fff" : "var(--soft)" }}
    >
      <div onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer">
        <div
          className="rounded-full flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--rule)",
            backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {title ?? <span className="heading flex-1 font-semibold text-[14.5px]">{name || "Без имени"}</span>}
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
