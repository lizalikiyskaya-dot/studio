import Link from "next/link";
import { Star } from "lucide-react";
import StarsHelp from "./StarsHelp";
import { rankForStars, rankProgressLine, starsLabel } from "./rules";

export default function StarsStatus({
  total,
  href,
}: {
  total: number;
  href?: string;
}) {
  const { current, next } = rankForStars(total);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3"
        style={{ background: "#fff", border: "1px solid var(--border)" }}
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
          style={{ background: "var(--y)", color: "var(--ink)" }}
          aria-hidden="true"
        >
          <Star size={14} />
        </span>
        <span className="text-[14.5px] font-semibold leading-none">{starsLabel(total)}</span>
        <span className="text-[13px] leading-none" style={{ color: "var(--ink2)" }}>
          {current.title}
        </span>
      </div>
      <StarsHelp />
      {next ? (
        <span className="text-[13px]" style={{ color: "var(--muted)" }}>
          {rankProgressLine(total)}
        </span>
      ) : (
        <span className="text-[13px]" style={{ color: "var(--muted)" }}>
          высший статус
        </span>
      )}
      {href ? (
        <Link href={href} className="lnk text-[13px]">
          Задание недели
        </Link>
      ) : null}
    </div>
  );
}
