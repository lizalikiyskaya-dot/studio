import { Prisma } from "@/generated/prisma/client";
import PageHeader from "@/components/PageHeader";
import QuotesEditor from "@/features/quotes/QuotesEditor";
import { quoteIndexForDate } from "@/lib/dailyQuote";
import { prisma } from "@/lib/prisma";

function missing(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

export default async function MentorQuotesPage() {
  let quotes: {
    id: string;
    text: string;
    author: string;
    source: string;
    translator: string;
    sortOrder: number;
  }[] = [];
  let ready = true;
  try {
    quotes = await prisma.dailyQuote.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, text: true, author: true, source: true, translator: true, sortOrder: true },
    });
  } catch (error) {
    if (!missing(error)) throw error;
    ready = false;
  }
  const todayIndex = quoteIndexForDate(new Date(), quotes.length);
  const todayId = quotes[todayIndex]?.id ?? null;

  return (
    <div>
      <PageHeader
        title="Цитаты дня"
        description="Список над календарём в кабинете. День по Москве выбирает одну строку по порядку. Письма отсюда не уходят."
      />
      {ready ? (
        <QuotesEditor quotes={quotes} todayId={todayId} />
      ) : (
        <div className="rounded-[24px] px-5 py-4" style={{ background: "var(--soft)", maxWidth: 720 }}>
          <p className="text-[15px]">Список ещё не подключён. После обновления сайта цитаты появятся здесь, ничего в кабинетах не пропадёт.</p>
        </div>
      )}
    </div>
  );
}
