import { oneClickBodyOk, optOutSecret, readOptOut } from "@/lib/mailOptOut";
import { setContentSubscription } from "@/lib/contentSubscription";

/** Одно нажатие из почтового клиента. Токен тот же, что у страницы /unsubscribe. */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const body = await request.text();
  if (!oneClickBodyOk(body)) return new Response("Нужно одно нажатие.", { status: 400 });
  const secret = optOutSecret();
  const parsed = secret ? readOptOut(token, secret) : null;
  if (!parsed) return new Response("Ссылка недействительна.", { status: 404 });
  const ok = await setContentSubscription(parsed.userId, parsed.kind, false);
  if (!ok) return new Response("Ссылка недействительна.", { status: 404 });
  return new Response("Готово.", { status: 200 });
}
