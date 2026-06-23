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

export default function ImageUploadBox({
  value,
  onUpload,
  placeholder,
  className,
  style,
}: {
  value?: string | null;
  onUpload: (dataUrl: string) => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value ?? "");

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    setPreview(dataUrl);
    onUpload(dataUrl);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className={className}
      style={{
        cursor: "pointer",
        color: "var(--faded)",
        border: "1px dashed var(--rule)",
        backgroundImage: preview ? `url(${preview})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        ...style,
      }}
    >
      {!preview && <span className="font-mono-label text-[9px]">{placeholder}</span>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}
