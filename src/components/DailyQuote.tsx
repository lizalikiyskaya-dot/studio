import type { DailyQuote as DailyQuoteRow } from "@/data/dailyQuotes";

export default function DailyQuote({ quote }: { quote: DailyQuoteRow }) {
  return (
    <aside className="daily-quote" aria-label="Цитата дня">
      <div className="daily-quote-kicker">Цитата дня</div>
      <p className="daily-quote-text">«{quote.text}»</p>
      <div className="daily-quote-author">
        <span className="daily-quote-rule" aria-hidden="true" />
        <span className="daily-quote-credit">
          {quote.author}, {quote.source}
        </span>
      </div>
    </aside>
  );
}
