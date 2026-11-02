import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueResetToken } from "@/lib/passwordReset";
import { sendPasswordResetEmail } from "@/lib/notify";

/**
 * Запрос ссылки на смену пароля.
 *
 * Первая попытка и неизвестная почта отвечают одинаково: иначе форма
 * проверяет, есть ли такой аккаунт. Повтор в пределах 2 минут бывает
 * только у существующего аккаунта, которому письмо уже ушло, и тогда
 * страница просит подождать.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Введите корректную почту" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  if (user) {
    const issued = await issueResetToken(user.id);
    if (!issued.ok) {
      return NextResponse.json({ ok: true, wait: true, retryAfterMs: issued.retryAfterMs });
    }
    const token = issued.token;
    after(async () => {
      try {
        await sendPasswordResetEmail(user, token);
      } catch (error) {
        console.error("[reset] письмо со ссылкой не ушло:", error);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
