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
            className="text-[13px] px-4 py-2 rounded-full"
            style={{
              border: `1px solid ${active === i ? "#E8E1DC" : "var(--rule)"}`,
              background: active === i ? "#E8E1DC" : "var(--paper-light)",
              color: active === i ? "var(--ink)" : "var(--ink-soft)",
              fontWeight: active === i ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div key={tab.label} style={{ display: active === i ? "block" : "none" }}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
