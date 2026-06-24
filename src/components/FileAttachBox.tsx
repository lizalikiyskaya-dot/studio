"use client";

import { useRef, useState } from "react";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FileAttachBox({
  fileName,
  onUpload,
}: {
  fileName?: string | null;
  onUpload: (fileName: string, dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(fileName ?? "");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      window.alert("Файл слишком большой (максимум 8 МБ)");
      return;
    }
    const dataUrl = await readAsDataUrl(file);
    setName(file.name);
    onUpload(file.name, dataUrl);
  }

  return (
    <label className="text-[12.5px] px-2.5 py-1 rounded-sm cursor-pointer inline-block" style={{ color: "var(--sage)", border: "1px solid var(--sage)" }}>
      {name || "+ файл"}
      <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
    </label>
  );
}
