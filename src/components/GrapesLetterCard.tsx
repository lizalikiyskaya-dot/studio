"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import Collapse from "@/components/Collapse";
import { Button } from "@/components/ui/Button";

type GrapesActions = { expandAll: () => void; collapseAll: () => void };

const GrapesBusContext = createContext<EventTarget | null>(null);
const GrapesActionsContext = createContext<GrapesActions | null>(null);

export function GrapesSection({ children }: { children: ReactNode }) {
  const [bus] = useState(() => new EventTarget());
  const actions = useMemo<GrapesActions>(
    () => ({
      expandAll: () => bus.dispatchEvent(new CustomEvent("grapes-open", { detail: true })),
      collapseAll: () => bus.dispatchEvent(new CustomEvent("grapes-open", { detail: false })),
    }),
    [bus],
  );

  return (
    <GrapesActionsContext.Provider value={actions}>
      <GrapesBusContext.Provider value={bus}>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 className="text-[17px] font-semibold">Метод GRAPES</h2>
          <GrapesSectionControls />
        </div>
        {children}
      </GrapesBusContext.Provider>
    </GrapesActionsContext.Provider>
  );
}

function GrapesSectionControls() {
  const actions = useContext(GrapesActionsContext);
  if (!actions) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={actions.collapseAll}>
        Свернуть все
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={actions.expandAll}>
        Развернуть все
      </Button>
    </div>
  );
}

export default function GrapesLetterCard({
  letter,
  label,
  children,
}: {
  letter: string;
  label: string;
  children: React.ReactNode;
}) {
  const bus = useContext(GrapesBusContext);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!bus) return;
    function onCommand(event: Event) {
      setOpen(Boolean((event as CustomEvent<boolean>).detail));
    }
    bus.addEventListener("grapes-open", onCommand);
    return () => bus.removeEventListener("grapes-open", onCommand);
  }, [bus]);

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
        <ChevronDown size={14} className={`chevron-turn${open ? " is-open" : ""}`} />
      </button>
      <Collapse open={open} className="mt-1.5">
        {children}
      </Collapse>
    </div>
  );
}
