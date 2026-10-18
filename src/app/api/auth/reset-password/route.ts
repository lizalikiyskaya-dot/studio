import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { consumeResetToken, lookupResetToken, passwordLengthError } from "@/lib/passwordReset";

const INVALID = "Ссылка недействительна или устарела. Запросите новую.";

/** GET — проверка ссылки перед показом формы (страница /reset-password). */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const found = await lookupResetToken(token);
  if (!found.ok) return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** POST — собственно смена пароля. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const lengthError = passwordLengthError(password);
  if (lengthError) {
    return NextResponse.json({ error: lengthError }, { status: 400 });
  }

  const found = await lookupResetToken(token);
  if (!found.ok) return NextResponse.json({ error: INVALID }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);
  await consumeResetToken(found.tokenId, found.userId, passwordHash);

  return NextResponse.json({ ok: true });
}
