import { LinkButton } from "@/components/ui/Button";
import { awaitingKindLabel, waitingLabel, type AwaitingItem } from "@/lib/awaitingReview";

export function AwaitingReview({ items, now }: { items: AwaitingItem[]; now: string }) {
  const clock = new Date(now);
  return (
    <section className="sheet p-4" aria-label="Ждут разбора">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold">Ждут разбора</h2>
        {items.length > 0 ? (
          <span className="rounded-full px-2 text-[12px] font-semibold text-white" style={{ background: "var(--ink)" }}>
            {items.length}
          </span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--muted)" }}>
          Сейчас разбирать нечего.
        </p>
      ) : (
        <div className="mt-1">
          {items.map((item) => (
            <article key={`${item.kind}:${item.id}`} className="await-row">
              <div className="min-w-0">
                <div className="await-who">{item.student}</div>
                <div className="await-title">{item.title}</div>
                <div className="await-wait">
                  {awaitingKindLabel(item.kind)} · ждёт {waitingLabel(item.at, clock)}
                </div>
              </div>
              <LinkButton href={item.href} size="sm">
                Разобрать
              </LinkButton>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
