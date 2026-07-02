"use client";

import { Pencil, X } from "lucide-react";
import { shortenUrl } from "@/lib/shortenUrl";

/**
 * Inline link affordance: "+ ссылка" when empty; once set, shows the
 * shortened URL as a link with edit (pencil, via prompt) and delete (×)
 * controls. Saving an empty string clears the link.
 */
export default function LinkCell({
  value,
  onSave,
  maxLength = 24,
}: {
  value: string;
  onSave: (value: string) => void;
  maxLength?: number;
}) {
  function promptEdit() {
    const url = window.prompt("Ссылка", value ?? "");
    if (url !== null) onSave(url.trim());
  }

  if (value) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          title={value}
          className="text-[12.5px] truncate underline underline-offset-2"
          style={{ color: "var(--accent)" }}
        >
          {shortenUrl(value, maxLength)}
        </a>
        <button onClick={promptEdit} title="Изменить ссылку" style={{ color: "var(--faded)", flexShrink: 0 }}>
          <Pencil size={11} />
        </button>
        <button onClick={() => onSave("")} title="Удалить ссылку" style={{ color: "var(--faded)", flexShrink: 0 }}>
          <X size={11} />
        </button>
      </div>
    );
  }

  return (
    <button onClick={promptEdit} className="text-[12px]" style={{ color: "var(--accent)" }}>
      + ссылка
    </button>
  );
}
