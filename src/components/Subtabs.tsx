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
  const toggle = variant === "toggle";

  return (
    <div>
      <div className={toggle ? "seg mb-6" : "flex flex-wrap gap-2 mb-6"}>
        {tabs.map((tab, i) => {
          const isActive = active === i;
          if (toggle) {
            return (
              <button
                key={tab.label}
                onClick={() => setActive(i)}
                className="text-[14px] px-4 py-1.5 rounded-full"
                style={{
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? "var(--ink)" : "var(--ink2)",
                  fontWeight: isActive ? 600 : 400,
                  boxShadow: isActive ? "0 1px 2px rgba(0,0,0,.06)" : undefined,
                }}
              >
                {tab.label}
              </button>
            );
          }
          return (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className="text-[14px] px-4 py-2 rounded-full"
              style={{
                background: isActive ? "var(--ink)" : "#fff",
                color: isActive ? "#fff" : "var(--ink)",
                border: isActive ? "none" : "1px solid var(--border)",
                fontWeight: isActive ? 600 : 500,
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
