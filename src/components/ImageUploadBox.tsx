"use client";

import { useRef, useState } from "react";
import { Pencil, Trash2, Maximize2, X } from "lucide-react";

const MAX_SIZE = 4 * 1024 * 1024;

export default function ImageUploadBox({
  value,
  onUpload,
  onDelete,
  onSelectUrl,
  defaults,
  placeholder,
  className,
  style,
  shape = "rect",
}: {
  value?: string | null;
  onUpload: (file: File) => void;
  onDelete?: () => void;
  onSelectUrl?: (url: string) => void;
  defaults?: string[];
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
  shape?: "rect" | "circle";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(value ?? "");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);

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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            <button type="button" onClick={() => inputRef.current?.click()} className="text-[12px]" style={{ color: "var(--faded)" }}>
              {placeholder}
            </button>
            {defaults && defaults.length > 0 && onSelectUrl && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDefaults((v) => !v); }}
                className="text-[10px] underline underline-offset-2"
                style={{ color: "var(--accent)" }}
              >
                из галереи
              </button>
            )}
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

      {showDefaults && defaults && onSelectUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: "rgba(31,32,30,0.6)" }}
          onClick={() => setShowDefaults(false)}
        >
          <div
            className="rounded-[16px] p-5"
            style={{ background: "#fff", maxWidth: 520, width: "90vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[14px] font-semibold">Выбрать портрет</span>
              <button onClick={() => setShowDefaults(false)} style={{ color: "var(--faded)" }}><X size={16} /></button>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {defaults.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    setPreview(url);
                    onSelectUrl(url);
                    setShowDefaults(false);
                  }}
                  className="rounded-full overflow-hidden hover:ring-2 transition-all"
                  style={{ aspectRatio: "1", width: "100%" }}
                >
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => { setShowDefaults(false); inputRef.current?.click(); }}
                className="text-[13px]"
                style={{ color: "var(--accent)" }}
              >
                + загрузить своё фото
              </button>
            </div>
          </div>
        </div>
      )}

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
