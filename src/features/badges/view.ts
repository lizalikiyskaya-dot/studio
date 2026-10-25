import { BADGE_SECTIONS } from "./catalogue";

export type BadgeView = {
  id: string;
  title: string;
  hint: string;
  image: string;
  section: string;
  sortOrder: number;
  earned: boolean;
  awardId: string | null;
  awardedAt: string | null;
  awardedLabel: string | null;
  source: "AUTO" | "MANUAL" | null;
  progressLabel: string | null;
};

export type BadgeCabinet = {
  ready: boolean;
  studentName: string;
  lead: string;
  line: string;
  openCount: number;
  badges: BadgeView[];
  widget: BadgeView[];
};

export function badgeGroups(badges: readonly BadgeView[]): { id: string; label: string; items: BadgeView[] }[] {
  const known = new Set<string>(BADGE_SECTIONS.map((section) => section.id));
  const groups: { id: string; label: string; items: BadgeView[] }[] = BADGE_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    items: badges.filter((badge) => badge.section === section.id),
  })).filter((group) => group.items.length > 0);
  const extra = badges.filter((badge) => !known.has(badge.section));
  if (extra.length > 0) groups.push({ id: "other", label: "Ещё", items: extra });
  return groups;
}
