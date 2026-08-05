import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
  }
  if (email.length > 200 || password.length > 200) {
    return NextResponse.json({ error: "Неверная почта или пароль" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Неверная почта или пароль" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Неверная почта или пароль" }, { status: 401 });
  }

  await createSession({ userId: user.id, role: user.role, status: user.status });

  return NextResponse.json({ ok: true, status: user.status });
}
