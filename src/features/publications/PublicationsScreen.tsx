"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function PublicationsScreen({
  tab,
  calls,
  tracker,
}: {
  tab: "calls" | "tracker";
  calls: ReactNode;
  tracker: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function open(next: "calls" | "tracker") {
    router.replace(next === "tracker" ? `${pathname}?tab=tracker` : `${pathname}?tab=calls`);
  }

  return (
    <div>
      <div className="pub-tabs" role="tablist" aria-label="Публикации">
        <button type="button" className={tab === "calls" ? "is-on" : ""} onClick={() => open("calls")}>
          Опен-коллы
        </button>
        <button type="button" className={tab === "tracker" ? "is-on" : ""} onClick={() => open("tracker")}>
          Трекер заявок
        </button>
      </div>
      {tab === "tracker" ? tracker : calls}
    </div>
  );
}
