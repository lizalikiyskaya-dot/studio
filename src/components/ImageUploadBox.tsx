"use client";

import { siteAlert, siteConfirm } from "@/components/SiteDialog";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pencil, X } from "lucide-react";

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
  readOnly = false,
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
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(value ?? "");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      await siteAlert("Файл слишком большой (максимум 4 МБ)");
      return;
    }
    setPreview(URL.createObjectURL(file));
    onUpload(file);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    if (!(await siteConfirm("Удалить фото?"))) return;
    setPreview("");
    onDelete?.();
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const frameStyle: React.CSSProperties = {
    color: "var(--faded)",
    border: "1px solid var(--border)",
    borderRadius: shape === "circle" ? "50%" : "inherit",
    overflow: "hidden",
    backgroundColor: preview ? "#E8E1DC" : "var(--soft)",
    backgroundImage: preview ? `url(${preview})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return (
    <>
      <div className={`group relative ${className ?? ""}`} style={style}>
        <div className="absolute inset-0" style={frameStyle}>
        {!preview && !readOnly && (
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
        {preview ? (
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Открыть фото"
            onClick={() => setLightboxOpen(true)}
          />
        ) : null}
        </div>
        {preview && !readOnly ? (
          <div
            ref={menuRef}
            className={`photo-tools absolute z-10 ${shape === "circle" ? "right-0 top-0" : "right-2 top-2"} ${menuOpen ? "is-open" : ""}`}
          >
            <button
              type="button"
              aria-label="Изменить фото"
              aria-expanded={menuOpen}
              title="Изменить фото"
              className="flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: "#fff", color: "var(--ink)", boxShadow: "0 1px 4px rgba(32,32,32,0.18)" }}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              <Pencil size={13} />
            </button>
            {menuOpen ? (
              <div
                className="absolute right-0 top-9 flex min-w-[132px] flex-col rounded-[14px] p-1"
                style={{ background: "#fff", boxShadow: "0 8px 24px rgba(32,32,32,0.16)", border: "1px solid var(--border)" }}
              >
                <button
                  type="button"
                  className="rounded-[10px] px-3 py-1.5 text-left text-[13px]"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    inputRef.current?.click();
                  }}
                >
                  заменить
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    className="rounded-[10px] px-3 py-1.5 text-left text-[13px]"
                    style={{ color: "var(--link)" }}
                    onClick={handleDelete}
                  >
                    удалить
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </div>

      {showDefaults && defaults && onSelectUrl && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center"
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
                  <Image
                    src={url}
                    alt=""
                    width={96}
                    height={96}
                    sizes="96px"
                    quality={70}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
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
          className="fixed inset-0 z-[120] flex items-center justify-center"
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
