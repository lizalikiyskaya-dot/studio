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
          const activeBg = variant === "toggle" ? "var(--wine)" : "#E8E1DC";
          const activeColor = variant === "toggle" ? "#fff" : "var(--ink)";
          return (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className={variant === "toggle" ? "text-[13px] px-4 py-1.5 rounded-full" : "text-[13px] px-4 py-2 rounded-full"}
              style={{
                border: `1px solid ${isActive ? activeBg : "var(--rule)"}`,
                background: isActive ? activeBg : "var(--paper-light)",
                color: isActive ? activeColor : "var(--ink-soft)",
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
