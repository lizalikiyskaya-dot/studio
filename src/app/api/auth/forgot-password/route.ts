import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueResetToken } from "@/lib/passwordReset";
import { sendPasswordResetEmail } from "@/lib/notify";

/**
 * Запрос ссылки на смену пароля.
 *
 * Ответ ВСЕГДА одинаковый — иначе форма превращается в проверку, есть ли
 * такая почта на платформе.
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
    after(async () => {
      try {
        const token = await issueResetToken(user.id);
        if (token) await sendPasswordResetEmail(user, token);
      } catch (error) {
        console.error("[reset] письмо со ссылкой не ушло:", error);
      }
    });
  }

  return NextResponse.json({ ok: true });
}
