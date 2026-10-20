"use server";

import { redirect } from "next/navigation";
import { optOutSecret, readOptOut } from "@/lib/mailOptOut";
import { setContentSubscription } from "@/lib/contentSubscription";

export async function restoreSubscription(token: string) {
  const secret = optOutSecret();
  const parsed = secret ? readOptOut(token, secret) : null;
  if (!parsed) return;
  await setContentSubscription(parsed.userId, parsed.kind, true);
  redirect(`/unsubscribe?token=${encodeURIComponent(token)}&restored=1`);
}
