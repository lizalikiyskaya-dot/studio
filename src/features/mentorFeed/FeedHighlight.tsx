"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Жёлтая подсветка элемента, на который ведёт ссылка из ленты. */
export default function FeedHighlight() {
  const pathname = usePathname();

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const node = document.getElementById(id);
      tries += 1;
      if (!node && tries < 10) return;
      window.clearInterval(timer);
      if (!node) return;
      node.classList.add("feed-hit");
      node.scrollIntoView({ block: "center" });
    }, 100);
    return () => window.clearInterval(timer);
  }, [pathname]);

  return null;
}
