"use client";

import { useState } from "react";

export default function Subtabs({
  tabs,
  variant = "page",
}: {
  tabs: { label: string; content: React.ReactNode }[];
  variant?: "page" | "toggle";
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {tabs.map((tab, i) => {
          const isActive = active === i;
          const toggle = variant === "toggle";
          // Subsections (toggle) use gold — solid gold when active, gold
          // outline + gold text when inactive. Sections (page) use the
          // neutral beige active fill.
          const activeBg = toggle ? "var(--gold)" : "#E8E1DC";
          const activeColor = toggle ? "#fff" : "var(--ink)";
          const inactiveBorder = toggle ? "var(--gold)" : "var(--rule)";
          const inactiveColor = toggle ? "var(--gold)" : "var(--ink-soft)";
          return (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className={toggle ? "text-[13px] px-4 py-1.5 rounded-full" : "text-[13px] px-4 py-2 rounded-full"}
              style={{
                border: `1px solid ${isActive ? activeBg : inactiveBorder}`,
                background: isActive ? activeBg : "var(--paper-light)",
                color: isActive ? activeColor : inactiveColor,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, i) => (
        <div key={tab.label} style={{ display: active === i ? "block" : "none" }}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
