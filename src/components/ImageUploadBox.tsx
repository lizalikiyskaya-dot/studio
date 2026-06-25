"use client";

import { useRef, useState } from "react";

const MAX_SIZE = 4 * 1024 * 1024;

export default function ImageUploadBox({
  value,
  onUpload,
  placeholder,
  className,
  style,
}: {
  value?: string | null;
  onUpload: (file: File) => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value ?? "");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      window.alert("Файл слишком большой (максимум 4 МБ)");
      return;
    }
    setPreview(URL.createObjectURL(file));
    onUpload(file);
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
      {!preview && <span className="text-[12px]">{placeholder}</span>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}
