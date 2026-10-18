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
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2"
      style={{ background: "transparent", border: "none", cursor: "pointer" }}
    >
      {label && <span className="text-[13.5px]" style={{ color: "inherit" }}>{label}</span>}
      <span
        className="relative inline-block rounded-full flex-shrink-0"
        style={{
          width: 36,
          height: 20,
          background: checked ? "var(--sage-bright)" : "#d9d9de",
          padding: 2,
          transition: "background 0.2s ease",
        }}
      >
        <span
          className="absolute rounded-full bg-white"
          style={{
            width: 16,
            height: 16,
            top: 2,
            left: checked ? 18 : 2,
            boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
            transition: "left 0.2s ease",
          }}
        />
      </span>
    </button>
  );
}
