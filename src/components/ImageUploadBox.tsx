"use client";

import { useRef, useState } from "react";
import { Pencil, Trash2, Maximize2, X } from "lucide-react";

const MAX_SIZE = 4 * 1024 * 1024;

export default function ImageUploadBox({
  value,
  onUpload,
  onDelete,
  placeholder,
  className,
  style,
  shape = "rect",
}: {
  value?: string | null;
  onUpload: (file: File) => void;
  onDelete?: () => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
  shape?: "rect" | "circle";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value ?? "");
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm("Удалить фото?")) return;
    setPreview("");
    onDelete?.();
  }

  return (
    <>
      <div
        className={`group relative ${className ?? ""}`}
        style={{
          cursor: "pointer",
          color: "var(--faded)",
          border: "1px dashed var(--rule)",
          borderRadius: shape === "circle" ? "50%" : undefined,
          overflow: "hidden",
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
        {!preview && (
          <div onClick={() => inputRef.current?.click()} className="absolute inset-0 flex items-center justify-center">
            <span className="text-[12px]">{placeholder}</span>
          </div>
        )}
        {preview && (
          <div
            className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "rgba(31,32,30,0.45)" }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              title="Открыть"
              className="flex items-center justify-center rounded-full"
              style={{ width: 26, height: 26, background: "#fff", color: "var(--ink)" }}
            >
              <Maximize2 size={13} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              title="Изменить"
              className="flex items-center justify-center rounded-full"
              style={{ width: 26, height: 26, background: "#fff", color: "var(--ink)" }}
            >
              <Pencil size={12} />
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title="Удалить"
                className="flex items-center justify-center rounded-full"
                style={{ width: 26, height: 26, background: "#fff", color: "var(--wine)" }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </div>

      {lightboxOpen && preview && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(31,32,30,0.85)" }}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-5 right-5 flex items-center justify-center rounded-full"
            style={{ width: 34, height: 34, background: "#fff", color: "var(--ink)" }}
          >
            <X size={16} />
          </button>
          <img
            src={preview}
            alt={placeholder}
            style={{ maxWidth: "85vw", maxHeight: "85vh", borderRadius: 8 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
