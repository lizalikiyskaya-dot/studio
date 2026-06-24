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
      className="flex items-center gap-2"
      style={{ background: "transparent", border: "none", cursor: "pointer" }}
    >
      {label && <span className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{label}</span>}
      <span
        className="relative inline-block rounded-full flex-shrink-0"
        style={{
          width: 38,
          height: 22,
          background: checked ? "var(--sage)" : "var(--rule)",
          transition: "background 0.2s ease",
        }}
      >
        <span
          className="absolute rounded-full bg-white"
          style={{
            width: 18,
            height: 18,
            top: 2,
            left: checked ? 18 : 2,
            boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
            transition: "left 0.2s ease",
          }}
        />
      </span>
    </button>
  );
}
