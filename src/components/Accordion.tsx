"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Collapse from "@/components/Collapse";

export default function Accordion({
  title,
  defaultOpen,
  headerExtra,
  headerPrefix,
  wrapHeader,
  id,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  headerExtra?: React.ReactNode;
  headerPrefix?: React.ReactNode;
  wrapHeader?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const chevron = (
    <span className={`chevron-turn${open ? " is-open" : ""}`}>
      <ChevronDown size={15} />
    </span>
  );

  return (
    <div
      id={id}
      className="hover-lift rounded-[14px] mb-3 overflow-hidden"
      style={{ border: "1px solid var(--rule)", background: open ? "#fff" : "var(--soft)" }}
    >
      <div
        onClick={() => setOpen((v) => !v)}
        className={`heading w-full flex items-center justify-between gap-3 px-4 py-3 text-left font-semibold text-[14.5px] cursor-pointer${wrapHeader ? " max-[699px]:flex-col max-[699px]:items-stretch" : ""}`}
      >
        {wrapHeader ? (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-2 max-[699px]:w-full">
              {headerPrefix}
              <span className="min-w-0 flex-1">{title}</span>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-3">
              {headerExtra}
              {chevron}
            </div>
          </>
        ) : (
          <>
            {headerPrefix}
            <span className="flex-1 min-w-0">{title}</span>
            {headerExtra}
            {chevron}
          </>
        )}
      </div>
      <Collapse open={open} className="collapse-body px-4 pb-5 pt-1">
        {children}
      </Collapse>
    </div>
  );
}
