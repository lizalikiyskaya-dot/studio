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
      {label && <span className="text-[13px]" style={{ color: "var(--ink)" }}>{label}</span>}
      <span
        className="relative inline-block rounded-full flex-shrink-0"
        style={{
          width: 44,
          height: 24,
          background: checked ? "var(--sage)" : "#D8D5CE",
          border: "none",
          transition: "background 0.2s ease",
        }}
      >
        <span
          className="absolute rounded-full bg-white"
          style={{
            width: 20,
            height: 20,
            top: 2,
            left: checked ? 22 : 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.28)",
            transition: "left 0.2s ease",
          }}
        />
      </span>
    </button>
  );
}
