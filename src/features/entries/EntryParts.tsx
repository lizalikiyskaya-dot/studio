"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, Pencil } from "lucide-react";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import EditableWithLinks from "@/components/EditableWithLinks";
import { sitePrompt } from "@/components/SiteDialog";

export function EntryTitle({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  return (
    <AutoGrowTextarea
      defaultValue={value}
      onBlur={onSave}
      placeholder={placeholder}
      className="entry-title"
    />
  );
}

export function EntryNote({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filled = value.trim().length > 0;
  return (
    <div className="entry-note">
      <button
        type="button"
        className="entry-note-toggle"
        aria-expanded={open}
        onClick={() => setOpen((item) => !item)}
      >
        <ChevronDown size={16} aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined }} />
        Примечание
        {filled ? <span className="entry-note-dot" aria-hidden="true" /> : null}
      </button>
      {open ? (
        <EditableWithLinks
          defaultValue={value}
          onSave={onSave}
          placeholder="примечание..."
          className="entry-note-body"
        />
      ) : null}
    </div>
  );
}

function linkLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Открыть";
  }
}

export function EntryLink({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  async function edit() {
    const next = await sitePrompt("Ссылка", value);
    if (next !== null) onSave(next.trim());
  }

  const href = value.trim();
  if (!href) {
    return (
      <button type="button" className="entry-link-btn entry-link-btn-ghost" onClick={edit}>
        Ссылка
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <a className="entry-link-btn" href={href} target="_blank" rel="noopener noreferrer" title={href}>
        <ArrowUpRight size={16} aria-hidden="true" />
        <span>{linkLabel(href)}</span>
      </a>
      <button type="button" className="entry-link-edit" onClick={edit} aria-label="Изменить ссылку">
        <Pencil size={13} aria-hidden="true" />
      </button>
    </div>
  );
}
