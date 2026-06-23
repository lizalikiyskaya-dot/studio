"use client";

import { useState } from "react";

export default function Subtabs({
  tabs,
}: {
  tabs: { label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className="font-mono-label text-[11px] px-3.5 py-1.5 rounded-sm"
            style={{
              border: `1px solid ${active === i ? "var(--wine)" : "var(--rule)"}`,
              background: active === i ? "var(--wine)" : "transparent",
              color: active === i ? "#fff" : "var(--ink-soft)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs[active].content}
    </div>
  );
}
