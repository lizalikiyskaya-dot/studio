"use client";

export default function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-2 w-full"
      style={{ background: "transparent", border: "none", cursor: "pointer" }}
    >
      {label && <span className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{label}</span>}
      <span
        className="relative inline-block rounded-full flex-shrink-0"
        style={{
          width: 30,
          height: 17,
          background: checked ? "var(--sage-soft)" : "var(--rule)",
          border: checked ? "1px solid var(--sage)" : "none",
          transition: "background 0.2s ease",
        }}
      >
        <span
          className="absolute rounded-full bg-white"
          style={{
            width: 13,
            height: 13,
            top: 1,
            left: checked ? 15 : 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            transition: "left 0.2s ease",
          }}
        />
      </span>
    </button>
  );
}
