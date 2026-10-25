"use client";

import Link from "next/link";
import type { BadgeView } from "./view";

export default function BadgeWidget({ href, badges, line }: { href: string; badges: BadgeView[]; line: string }) {
  if (badges.length === 0) return null;
  return (
    <Link
      href={href}
      className="badge-widget mt-3 flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] px-3 py-2"
      style={{ background: "#fff", border: "1px solid var(--border)" }}
    >
      <span className="text-[14.5px] font-semibold">Значки</span>
      <span className="flex items-center gap-1.5">
        {badges.map((badge) => (
          <img
            key={badge.id}
            src={badge.image}
            alt=""
            width={52}
            height={52}
            className={`badge-medal badge-medal-sm${badge.earned ? "" : " is-locked"}`}
          />
        ))}
      </span>
      <span className="text-[13px]" style={{ color: "var(--ink2)" }}>
        {line}
      </span>
    </Link>
  );
}
