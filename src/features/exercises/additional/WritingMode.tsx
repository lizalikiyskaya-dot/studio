"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";

export default function WritingMode({
  title,
  saveLabel,
  onClose,
  children,
}: {
  title: string;
  saveLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="writing-mode" role="dialog" aria-modal="true" aria-label="Режим письма">
      <button type="button" className="writing-mode-backdrop" aria-label="Закрыть" onClick={onClose} />
      <div className="writing-mode-sheet">
        <div className="writing-mode-top">
          <div className="writing-mode-title">{title.trim() || "Без названия"}</div>
          <span className="writing-mode-save">{saveLabel}</span>
          <Button type="button" variant="secondary" size="sm" pill onClick={onClose}>
            Закрыть
          </Button>
        </div>
        <div className="writing-mode-body">{children}</div>
        <p className="writing-mode-hint">Закройте окно клавишей Esc или кнопкой «Закрыть». Текст сохранится сам.</p>
      </div>
    </div>,
    document.body,
  );
}
