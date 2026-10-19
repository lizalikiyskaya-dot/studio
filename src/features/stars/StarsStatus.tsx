import Link from "next/link";
import { Star } from "lucide-react";
import StarsHelp from "./StarsHelp";
import { rankForStars, STAR_LEGEND, starsLabel } from "./rules";

export default function StarsStatus({
  total,
  href,
}: {
  total: number;
  href?: string;
}) {
  const { current, next, remaining } = rankForStars(total);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          className="flex items-center gap-3 rounded-[14px] px-3 py-2"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ background: "var(--y)", color: "var(--ink)" }}
            aria-hidden="true"
          >
            <Star size={18} />
          </span>
          <span>
            <span className="block text-[20px] font-semibold leading-none">{starsLabel(total)}</span>
            <span className="mt-1 block text-[13.5px]" style={{ color: "var(--ink2)" }}>
              {current.title}
            </span>
          </span>
        </div>
        <StarsHelp />
        {next ? (
          <span className="text-[13.5px]" style={{ color: "var(--muted)" }}>
            до статуса «{next.title}» ещё {starsLabel(remaining)}
          </span>
        ) : (
          <span className="text-[13.5px]" style={{ color: "var(--muted)" }}>
            высший статус
          </span>
        )}
        {href ? (
          <Link href={href} className="lnk text-[13.5px]">
            Задание недели
          </Link>
        ) : null}
      </div>
      <ul className="mt-3 flex flex-wrap gap-2 text-[13px]" style={{ color: "var(--ink2)" }}>
        {STAR_LEGEND.map((item) => (
          <li key={item.label} className="rounded-full px-3 py-1" style={{ background: "var(--soft)" }}>
            {item.points} — {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
