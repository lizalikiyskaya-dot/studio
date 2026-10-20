import { createHmac, timingSafeEqual } from "node:crypto";

export type OptOutKind = "weekly" | "quote";

export function optOutSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.JWT_SECRET?.trim();
  return secret || null;
}

export function signOptOut(userId: string, kind: OptOutKind, secret: string): string {
  const body = Buffer.from(JSON.stringify({ u: userId, k: kind }), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readOptOut(token: string, secret: string): { userId: string; kind: OptOutKind } | null {
  const cut = token.indexOf(".");
  if (cut <= 0) return null;
  const body = token.slice(0, cut);
  const sig = token.slice(cut + 1);
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { u?: unknown; k?: unknown };
    if ((data.k !== "weekly" && data.k !== "quote") || typeof data.u !== "string" || !data.u) return null;
    return { userId: data.u, kind: data.k };
  } catch {
    return null;
  }
}

export function optOutLabel(kind: OptOutKind): string {
  return kind === "weekly" ? "заданий недели" : "цитат дня";
}

export function optOutLinkLabel(kind: OptOutKind): string {
  return kind === "weekly" ? "Отписаться от заданий недели" : "Отписаться от цитат дня";
}
