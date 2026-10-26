import { Prisma } from "@/generated/prisma/client";
import PageHeader from "@/components/PageHeader";
import QuotesEditor from "@/features/quotes/QuotesEditor";
import { pinDailyQuote } from "@/lib/loadDailyQuote";
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
    active: boolean;
  }[] = [];
  let ready = true;
  try {
    quotes = await prisma.dailyQuote.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true, text: true, author: true, source: true, translator: true, sortOrder: true, active: true },
    });
  } catch (error) {
    if (!missing(error)) throw error;
    ready = false;
  }
  const pinned = await pinDailyQuote(quotes.filter((quote) => quote.active));
  const todayId = pinned.today?.id ?? null;
  const tomorrowId = pinned.tomorrow?.id ?? null;

  return (
    <div>
      <PageHeader
        title="Цитаты дня"
        description="Список над календарём в кабинете. Каждый день берётся следующая цитата по этому порядку. Строка вне очереди остаётся здесь, её можно вернуть. Письма отсюда не уходят."
      />
      {ready ? (
        <QuotesEditor quotes={quotes} todayId={todayId} tomorrowId={tomorrowId} />
      ) : (
        <div className="rounded-[24px] px-5 py-4" style={{ background: "var(--soft)", maxWidth: 720 }}>
          <p className="text-[15px]">Список ещё не подключён. После обновления сайта цитаты появятся здесь, ничего в кабинетах не пропадёт.</p>
        </div>
      )}
    </div>
  );
}
