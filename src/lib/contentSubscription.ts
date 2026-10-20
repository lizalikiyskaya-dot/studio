import { prisma } from "@/lib/prisma";
import type { OptOutKind } from "@/lib/mailOptOut";

function missingColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  const code = (error as { code?: string }).code;
  return code === "P2022" || message.includes("weeklyEmails") || message.includes("quoteEmails");
}

/** enabled true: снова получать. false: отписка. Только ученик. */
export async function setContentSubscription(userId: string, kind: OptOutKind, enabled: boolean): Promise<boolean> {
  const data = kind === "weekly" ? { weeklyEmails: enabled } : { quoteEmails: enabled };
  try {
    const result = await prisma.user.updateMany({
      where: { id: userId, role: "STUDENT" },
      data,
    });
    return result.count === 1;
  } catch (error) {
    if (missingColumn(error)) return false;
    throw error;
  }
}
