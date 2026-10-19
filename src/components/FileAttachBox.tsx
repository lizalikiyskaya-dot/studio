"use client";

import { siteAlert } from "@/components/SiteDialog";

import { useRef, useState } from "react";

export default function FileAttachBox({
  fileName,
  label = "+ файл",
  onUpload,
}: {
  fileName?: string | null;
  label?: string;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(fileName ?? "");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      await siteAlert("Файл слишком большой (максимум 8 МБ)");
      return;
    }
    setName(file.name);
    onUpload(file);
  }

  return (
    <label className="text-[13px] px-4 py-1.5 rounded-full cursor-pointer inline-flex items-center gap-1.5 transition-colors" style={{ color: "var(--vi)", border: "1px dashed var(--v)" }}>
      {name || label}
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
    </label>
  );
}
