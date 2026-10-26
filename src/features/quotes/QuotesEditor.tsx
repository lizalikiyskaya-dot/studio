"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { siteConfirm } from "@/components/SiteDialog";
import { Button } from "@/components/ui/Button";
import { createQuote, deleteQuote, moveQuote, setQuoteActive, updateQuote, type QuoteRow } from "./actions";

const EMPTY = { text: "", author: "", source: "", translator: "" };

function Notice({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p
      className="mt-3 rounded-[14px] px-4 py-2.5 text-[13.5px]"
      role="status"
      style={
        ok
          ? { background: "var(--pill-mint-bg)", color: "var(--pill-mint-fg)" }
          : { background: "var(--pill-red-bg)", color: "var(--pill-red-fg)" }
      }
    >
      {text}
    </p>
  );
}

export default function QuotesEditor({
  quotes: initial,
  todayId,
  tomorrowId = null,
}: {
  quotes: QuoteRow[];
  todayId: string | null;
  tomorrowId?: string | null;
}) {
  const router = useRouter();
  const [quotes, setQuotes] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(todayId);
  const [draft, setDraft] = useState(EMPTY);
  const [draftNote, setDraftNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [rowNote, setRowNote] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh(next: QuoteRow[]) {
    setQuotes(next);
    router.refresh();
  }

  function add() {
    setDraftNote(null);
    startTransition(async () => {
      const result = await createQuote(draft);
      if ("error" in result) {
        setDraftNote({ ok: false, text: result.error });
        return;
      }
      setDraft(EMPTY);
      setOpenId(result.quote.id);
      setDraftNote({ ok: true, text: "Цитата добавлена в конец списка." });
      refresh([...quotes, result.quote]);
    });
  }

  function save(quote: QuoteRow) {
    setRowNote(null);
    startTransition(async () => {
      const result = await updateQuote(quote.id, quote);
      if ("error" in result) {
        setRowNote({ id: quote.id, ok: false, text: result.error });
        return;
      }
      setRowNote({ id: quote.id, ok: true, text: "Сохранено." });
      refresh(quotes.map((row) => (row.id === quote.id ? quote : row)));
    });
  }

  async function remove(quote: QuoteRow) {
    const yes = await siteConfirm(`Удалить цитату ${quote.author}? В кабинете её больше не будет.`);
    if (!yes) return;
    startTransition(async () => {
      const result = await deleteQuote(quote.id);
      if ("error" in result) {
        setRowNote({ id: quote.id, ok: false, text: result.error });
        return;
      }
      refresh(quotes.filter((row) => row.id !== quote.id));
    });
  }

  function restore(id: string) {
    setRowNote(null);
    startTransition(async () => {
      const result = await setQuoteActive(id, true);
      if ("error" in result) {
        setRowNote({ id, ok: false, text: result.error });
        return;
      }
      setRowNote({ id, ok: true, text: "Цитата снова в очереди." });
      refresh(quotes.map((quote) => (quote.id === id ? { ...quote, active: true } : quote)));
    });
  }

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveQuote(id, direction);
      if ("error" in result) {
        setRowNote({ id, ok: false, text: result.error });
        return;
      }
      const index = quotes.findIndex((quote) => quote.id === id);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= quotes.length) return;
      const next = [...quotes];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      refresh(next.map((quote, order) => ({ ...quote, sortOrder: order + 1 })));
    });
  }

  function patch(id: string, partial: Partial<QuoteRow>) {
    setQuotes((prev) => prev.map((quote) => (quote.id === id ? { ...quote, ...partial } : quote)));
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 820 }}>
      <section className="sheet px-5 py-5 sm:px-6">
        <h2 className="text-[20px]">Новая цитата</h2>
        <label className="fld-label">
          Текст
          <textarea
            className="fld field-literary text-[17px] leading-relaxed"
            rows={4}
            value={draft.text}
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
            placeholder="Строка о ремесле, не из романа"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="fld-label">
            Автор
            <input className="fld" value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} />
          </label>
          <label className="fld-label">
            Источник
            <input className="fld" value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} placeholder="Письмо, эссе или книга" />
          </label>
        </div>
        <label className="fld-label">
          Переводчик
          <input
            className="fld"
            value={draft.translator}
            onChange={(event) => setDraft({ ...draft, translator: event.target.value })}
            placeholder="Необязательно. На карточке не показывается"
          />
        </label>
        <div className="mt-4">
          <Button type="button" pill disabled={pending} onClick={add}>
            {pending ? "Сохраняем…" : "Добавить цитату"}
          </Button>
        </div>
        {draftNote ? <Notice ok={draftNote.ok} text={draftNote.text} /> : null}
      </section>

      <p className="text-[14px]" style={{ color: "var(--ink2)" }}>
        В списке {quotes.length}. Сегодняшняя строка закреплена: правка списка не сдвигает день. Завтра берётся следующая.
      </p>

      {quotes.map((quote, index) => {
        const open = openId === quote.id;
        const today = quote.id === todayId;
        const tomorrow = quote.id === tomorrowId && quote.id !== todayId;
        return (
          <article
            key={quote.id}
            className="rounded-[14px] px-4 py-4 sm:px-5"
            style={{ border: "1px solid var(--border)", background: today ? "var(--note)" : "#fff" }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                {index + 1}
              </span>
              <span className="text-[16px] font-semibold">{quote.author || "Без автора"}</span>
              {today ? (
                <span className="rounded-full px-2.5 py-0.5 text-[12px] font-medium" style={{ background: "var(--y)", color: "var(--ink)" }}>
                  {todayId === tomorrowId ? "сегодня и завтра" : "сегодня"}
                </span>
              ) : null}
              {tomorrow ? (
                <span className="rounded-full px-2.5 py-0.5 text-[12px] font-medium" style={{ background: "var(--soft)", color: "var(--ink)" }}>
                  завтра
                </span>
              ) : null}
              {quote.active === false ? (
                <span className="rounded-full px-2.5 py-0.5 text-[12px] font-medium" style={{ background: "var(--soft)", color: "var(--ink)" }}>
                  вне очереди
                </span>
              ) : null}
              <span className="ml-auto flex flex-wrap gap-2">
                {quote.active === false ? (
                  <Button type="button" variant="secondary" size="sm" pill disabled={pending} onClick={() => restore(quote.id)}>
                    Вернуть в очередь
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" size="sm" pill disabled={pending || index === 0} onClick={() => move(quote.id, "up")}>
                  Выше
                </Button>
                <Button type="button" variant="secondary" size="sm" pill disabled={pending || index === quotes.length - 1} onClick={() => move(quote.id, "down")}>
                  Ниже
                </Button>
                <Button type="button" variant="secondary" size="sm" pill onClick={() => setOpenId(open ? null : quote.id)}>
                  {open ? "Свернуть" : "Править"}
                </Button>
              </span>
            </div>
            {!open ? (
              <p className="field-literary panel-fade mt-2 text-[16px] leading-relaxed" style={{ color: "var(--ink2)" }}>
                {quote.text.length > 180 ? `${quote.text.slice(0, 180)}…` : quote.text}
              </p>
            ) : (
              <div className="panel-fade">
                <label className="fld-label">
                  Текст
                  <textarea
                    className="fld field-literary text-[17px] leading-relaxed"
                    rows={5}
                    value={quote.text}
                    onChange={(event) => patch(quote.id, { text: event.target.value })}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="fld-label">
                    Автор
                    <input className="fld" value={quote.author} onChange={(event) => patch(quote.id, { author: event.target.value })} />
                  </label>
                  <label className="fld-label">
                    Источник
                    <input className="fld" value={quote.source} onChange={(event) => patch(quote.id, { source: event.target.value })} />
                  </label>
                </div>
                <label className="fld-label">
                  Переводчик
                  <input
                    className="fld"
                    value={quote.translator}
                    onChange={(event) => patch(quote.id, { translator: event.target.value })}
                    placeholder="На карточке не показывается"
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" pill disabled={pending} onClick={() => save(quote)}>
                    Сохранить
                  </Button>
                  <button
                    type="button"
                    className="rounded-full px-4 text-[14px]"
                    style={{ height: 44, color: "var(--danger)" }}
                    disabled={pending}
                    onClick={() => remove(quote)}
                  >
                    Удалить
                  </button>
                </div>
                {rowNote?.id === quote.id ? <Notice ok={rowNote.ok} text={rowNote.text} /> : null}
              </div>
            )}
            {!open ? (
              <p className="mt-2 text-[13px]" style={{ color: "var(--muted)" }}>
                {quote.source}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
