import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
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

  await prisma.user.create({
    data: { name, email, passwordHash },
  });

  return NextResponse.json({ ok: true });
}
