"use client";

import { useState } from "react";

export default function CollapsibleCharacterShell({
  name,
  photoUrl,
  headerExtra,
  defaultOpen,
  children,
}: {
  name: string;
  photoUrl: string | null;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <div
      className="rounded-md mb-4 overflow-hidden max-w-[760px]"
      style={{ border: "1px solid var(--rule)", background: open ? "#fff" : "#FAFAF9" }}
    >
      <div onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
        <div
          className="rounded-sm flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--rule)",
            backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <span className="flex-1 font-semibold text-[14.5px]">{name || "Без имени"}</span>
        {headerExtra}
        <span
          className="text-[12px] flex-shrink-0"
          style={{ color: "var(--faded)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}
        >
          ▾
        </span>
      </div>
      {open && (
        <div className="px-4 pb-5 pt-1 border-t" style={{ borderColor: "var(--rule)" }}>
          {children}
        </div>
      )}
    </div>
  );
}
