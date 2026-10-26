import type { StarPurchase } from "@/features/stars/award";

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(date);
}

/** Покупки ученика в журнале звёзд. Пустой список тоже показываем: наставник видит, куда смотреть. */
export default function StarJournal({ rows }: { rows: StarPurchase[] }) {
  return (
    <div className="star-journal mt-3">
      <h3 className="text-[14px] font-semibold">Журнал звёзд</h3>
      {rows.length === 0 ? (
        <p className="mt-1 text-[13.5px]" style={{ color: "var(--muted)" }}>
          Покупок пока нет.
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.id} className="text-[13.5px]" style={{ color: "var(--ink)" }}>
              −{row.points} · {row.note || "покупка методички"}
              {row.createdAt ? <span style={{ color: "var(--muted)" }}> · {when(row.createdAt)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
