"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Collapse from "@/components/Collapse";

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
      style={{ border: "1px solid var(--border)", background: open ? "#fff" : "var(--soft)" }}
    >
      <div onClick={() => setOpen((v) => !v)} className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5">
        <div
          className="rounded-full flex-shrink-0"
          style={{
            width: 32,
            height: 32,
            border: "1px solid var(--border)",
            backgroundColor: "var(--soft)",
            backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {title ?? <span className="heading min-w-0 flex-1 font-semibold text-[14.5px]">{name || "Без имени"}</span>}
        {headerExtra}
        <span className={`chevron-turn${open ? " is-open" : ""}`}>
          <ChevronDown size={15} />
        </span>
      </div>
      <Collapse open={open} className="collapse-body px-4 pb-5 pt-1">
        {children}
      </Collapse>
    </div>
  );
}
