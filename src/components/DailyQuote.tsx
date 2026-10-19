import { quoteForDate } from "@/lib/dailyQuote";

export default function DailyQuote() {
  const quote = quoteForDate();
  return (
    <aside className="daily-quote" aria-label="Цитата дня">
      <div className="daily-quote-kicker">Цитата дня</div>
      <p className="daily-quote-text">«{quote.text}»</p>
      <div className="daily-quote-author" title={quote.source}>
        <span className="daily-quote-rule" aria-hidden="true" />
        {quote.author}
      </div>
    </aside>
  );
}
