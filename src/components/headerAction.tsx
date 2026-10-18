"use client";

import { useEffect, useRef, type ReactNode } from "react";

const handlers = new Map<string, () => void>();

export function useHeaderAction(id: string, fn: () => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const run = () => ref.current();
    handlers.set(id, run);
    return () => {
      if (handlers.get(id) === run) handlers.delete(id);
    };
  }, [id]);
}

export function HeaderButton({
  actionId,
  children,
  tone = "yellow",
}: {
  actionId: string;
  children: ReactNode;
  tone?: "yellow" | "soft";
}) {
  return (
    <button
      type="button"
      className="btn-y px-5 text-[14.5px]"
      style={{
        height: 44,
        width: "auto",
        background: tone === "soft" ? "var(--soft)" : undefined,
        fontWeight: tone === "soft" ? 500 : 600,
      }}
      onClick={() => handlers.get(actionId)?.()}
    >
      {children}
    </button>
  );
}
