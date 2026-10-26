import { prisma } from "@/lib/prisma";
import { badgeProgress, badgesStillOpen, galleryLead, hintFor, widgetBadges, widgetLine } from "./rules";
import { loadBadgeFacts } from "./sync";
import type { BadgeCabinet, BadgeView } from "./view";

export type { BadgeCabinet, BadgeView } from "./view";
export { badgeGroups } from "./view";

function badgeDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Moscow",
  }).format(date);
}

function missingSchema(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === "P2021" || code === "P2022";
}

export async function loadBadges(studentId: string): Promise<BadgeCabinet> {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { name: true } });
  const name = student?.name ?? "";
  const empty: BadgeCabinet = {
    ready: false,
    studentName: name,
    lead: galleryLead(),
    line: "",
    openCount: 0,
    badges: [],
    widget: [],
  };
  try {
    const [rows, awards, facts] = await Promise.all([
      prisma.badge.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }),
      prisma.badgeAward.findMany({
        where: { studentId, revokedAt: null },
        select: { id: true, badgeId: true, source: true, awardedAt: true },
      }),
      loadFactsSafe(studentId),
    ]);
    const byBadge = new Map(awards.map((award) => [award.badgeId, award]));
    const badges: BadgeView[] = rows.map((row) => {
      const award = byBadge.get(row.id) ?? null;
      const progress = facts ? badgeProgress(row.id, facts) : null;
      return {
        id: row.id,
        title: row.title,
        hint: hintFor(row),
        image: row.image,
        section: row.section,
        sortOrder: row.sortOrder,
        earned: award != null,
        awardId: award?.id ?? null,
        awardedAt: award ? award.awardedAt.toISOString() : null,
        awardedLabel: award ? badgeDateLabel(award.awardedAt) : null,
        source: award?.source ?? null,
        progressLabel: progress && progress.total > 1 ? `${progress.current} из ${progress.total}` : null,
      };
    });
    const earned = badges.filter((badge) => badge.earned).length;
    const openCount = badgesStillOpen(badges.length, earned);
    return {
      ready: true,
      studentName: name,
      lead: galleryLead(),
      line: widgetLine(openCount),
      openCount,
      badges,
      widget: widgetBadges(badges),
    };
  } catch (error) {
    if (missingSchema(error)) return empty;
    throw error;
  }
}

async function loadFactsSafe(studentId: string) {
  try {
    return await loadBadgeFacts(studentId);
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error)) throw error;
    const code = String((error as { code?: unknown }).code);
    if (code === "P2021" || code === "P2022") return null;
    throw error;
  }
}
