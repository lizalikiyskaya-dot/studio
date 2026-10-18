import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole, UserStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "session";

export type SessionPayload = {
  userId: string;
  role: UserRole;
  status: UserStatus;
  /**
   * Копия User.tokenVersion на момент входа. Нет в старых токенах —
   * для них считается 0, пока пароль ни разу не меняли.
   */
  tokenVersion?: number;
};

/** Старые куки без поля считаем версией 0. Мусор в поле — не сессия. */
function tokenVersionFromPayload(value: unknown): number | null {
  if (value === undefined) return 0;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  return null;
}

export async function createSession(payload: SessionPayload & { tokenVersion: number }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let payload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    ({ payload } = await jwtVerify(token, secret));
  } catch {
    return null;
  }

  const session = payload as unknown as SessionPayload;
  if (typeof session.userId !== "string" || !session.userId) return null;

  const tokenVersion = tokenVersionFromPayload(payload.tokenVersion);
  if (tokenVersion === null) return null;

  // Сверяем версию с базой, а не только подпись: после смены пароля
  // tokenVersion увеличивается, и остальные устройства теряют сессию.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tokenVersion: true },
  });
  if (!user || user.tokenVersion !== tokenVersion) return null;

  return { ...session, tokenVersion };
}
