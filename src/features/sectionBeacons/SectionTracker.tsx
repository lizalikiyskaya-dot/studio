"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { markSectionSeen, markSectionActivity } from "./actions";

// Sidebar sections we track. Keys match the URL segment after the base path.
const TRACKED = new Set([
  "tasks", "work-plan", "materials", "drafts", "exercises", "submissions", "open-calls",
  "about", "plan", "acts", "dossier", "arcs", "setting", "cycles", "stories",
]);

function sectionFromPath(pathname: string, basePath: string): string {
  const rel = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  const seg = rel.split("/").filter(Boolean)[0] ?? "";
  return TRACKED.has(seg) ? seg : "";
}

export default function SectionTracker({ studentId, basePath }: { studentId: string; basePath: string }) {
  const pathname = usePathname();
  const section = sectionFromPath(pathname ?? "", basePath);
  const sectionRef = useRef(section);
  sectionRef.current = section;

  // Mark the section seen whenever the viewer lands on it.
  useEffect(() => {
    if (section) void markSectionSeen(studentId, section);
  }, [studentId, section]);

  // Any edit (typing, selecting a date/dropdown) inside the main content
  // stamps activity for the current section — a single delegated listener,
  // debounced, instead of wiring every save handler.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    function onEdit(e: Event) {
      const sec = sectionRef.current;
      if (!sec) return;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      // Ignore the sidebar and the floating notes panel — not section content.
      if (el.closest("aside") || el.closest('[data-notes-ui="1"]')) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void markSectionActivity(studentId, sec), 1500);
    }
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
    };
  }, [studentId]);

  return null;
}
