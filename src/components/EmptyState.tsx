import type { ReactNode } from "react";
import Mark from "@/components/Mark";

export default function EmptyState({
  cue,
  detail,
  action,
  compact,
}: {
  cue: string;
  detail?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={compact ? "px-4 py-8 text-center" : "rounded-[24px] px-6 py-14 text-center"}
      style={compact ? undefined : { border: "1px solid var(--border)", background: "#fff" }}
    >
      <p className={compact ? "text-[22px] font-semibold tracking-tight" : "page-title"}>
        Пока <Mark>пусто</Mark>.
      </p>
      <p className={compact ? "mt-1 text-[16px] font-semibold leading-tight" : "mt-2 text-[26px] font-semibold leading-tight tracking-tight"}>{cue}</p>
      {detail ? (
        <p className="mx-auto mt-3 max-w-[420px] text-[15px] leading-snug" style={{ color: "var(--ink2)" }}>
          {detail}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
