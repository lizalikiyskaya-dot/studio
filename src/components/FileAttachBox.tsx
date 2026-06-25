"use client";

import { useRef, useState } from "react";

export default function FileAttachBox({
  fileName,
  onUpload,
}: {
  fileName?: string | null;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(fileName ?? "");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      window.alert("Файл слишком большой (максимум 8 МБ)");
      return;
    }
    setName(file.name);
    onUpload(file);
  }

  return (
    <label className="text-[12.5px] px-2.5 py-1 rounded-sm cursor-pointer inline-block" style={{ color: "var(--sage)", border: "1px solid var(--sage)" }}>
      {name || "+ файл"}
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
    </label>
  );
}
