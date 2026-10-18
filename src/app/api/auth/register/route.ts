import { NextResponse, after } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyRegistration } from "@/lib/notify";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }
  // Ограничиваем длину: поля уходят прямо в базу, без потолка это способ
  // раздуть её мусором на мегабайты одним запросом.
  if (name.length > 120 || email.length > 200 || password.length > 200) {
    return NextResponse.json({ error: "Слишком длинное значение" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Пароль должен быть не короче 8 символов" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Пользователь с такой почтой уже зарегистрирован" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
  });

  // Письма — после ответа: регистрация не должна ждать SMTP и не должна
  // падать, если почта недоступна.
  after(async () => {
    try {
      await notifyRegistration({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      console.error("[notify] письма о регистрации не ушли:", error);
    }
  });

  return NextResponse.json({ ok: true });
}
