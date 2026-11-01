import type { StarHistoryEntry } from "./award";
import { starHistoryDate } from "./history";
import { starsLabel } from "./rules";

/** Список начислений в кабинете ученика. Сначала свежие. */
export default function StarHistory({ rows }: { rows: StarHistoryEntry[] }) {
  return (
    <div className="mt-4">
      <h3 className="text-[14px] font-semibold">История звёздочек</h3>
      <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>
        Здесь записано, за что Вам начислили звёздочки.
      </p>
      {rows.length === 0 ? (
        <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>
          Пока пусто. Звёздочки появятся, когда Вы сдадите задание, главу или задание недели.
        </p>
      ) : (
        <ul className="mt-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-baseline justify-between gap-4 border-b py-2 text-[14px]"
              style={{ borderColor: "var(--border)" }}
            >
              <span>
                <span className="font-semibold">{starsLabel(row.points)}</span>
                <span style={{ color: "var(--ink2)" }}> · {row.reason}</span>
              </span>
              <time dateTime={row.at} className="shrink-0 text-[13px]" style={{ color: "var(--muted)" }}>
                {starHistoryDate(row.at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
