"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Camera, X, ImageIcon, Move } from "lucide-react";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";

type UploadTarget = Parameters<typeof deletePhoto>[0];
export type CoverSlot = { target: UploadTarget; field: string; posField: string };

function parsePos(pos: string): [number, number] {
  const parts = pos.split(" ");
  return [parseFloat(parts[0]) || 50, parseFloat(parts[1]) || 50];
}

function useDragPosition(initial: string, onSave: (pos: string) => void) {
  const [position, setPosition] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPx: number; startPy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const [px, py] = parsePos(position);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPx: px, startPy: py };
    setDragging(true);

    const compute = (me: MouseEvent) => {
      const { width, height } = containerRef.current!.getBoundingClientRect();
      const dx = me.clientX - dragRef.current!.startX;
      const dy = me.clientY - dragRef.current!.startY;
      const newPx = Math.max(0, Math.min(100, dragRef.current!.startPx - (dx / width) * 100));
      const newPy = Math.max(0, Math.min(100, dragRef.current!.startPy - (dy / height) * 100));
      return `${Math.round(newPx)}% ${Math.round(newPy)}%`;
    };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      setPosition(compute(me));
    };
    const onUp = (me: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const pos = compute(me);
      setPosition(pos);
      onSave(pos);
      setDragging(false);
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [position, onSave]);

  return { position, dragging, containerRef, onMouseDown };
}

// ── Banner ("фото профиля" фон) ──────────────────────────────────────────
export function BannerSection({
  recordId,
  target,
  field,
  initialUrl,
  initialPosition,
  onSavePosition,
}: {
  recordId: string;
  target: UploadTarget;
  field: string;
  initialUrl: string | null;
  initialPosition: string;
  onSavePosition: (pos: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const { position, dragging, containerRef, onMouseDown } = useDragPosition(initialPosition, onSavePosition);

  function handleFile(file: File) {
    setUrl(URL.createObjectURL(file));
    startTransition(() => { void uploadFile(target, recordId, field, file); });
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: 200, background: url ? undefined : "var(--bg-surface-2)", cursor: url ? (dragging ? "grabbing" : "default") : "pointer", border: url ? "none" : "2px dashed var(--border)" }}
      onClick={() => !url && inputRef.current?.click()}
    >
      {url ? (
        <>
          <img src={url} alt="" className="w-full h-full object-cover" style={{ objectPosition: position }} />
          <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button onMouseDown={onMouseDown} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)", cursor: "grab" }} title="Зажмите и перетащите, чтобы переместить">
              <Move size={13} /> переместить
            </button>
            <button onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)" }}>
              <Camera size={13} /> изменить фон
            </button>
            <button onClick={() => { setUrl(null); startTransition(() => { void deletePhoto(target, recordId, field); }); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium" style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)" }}>
              <X size={13} /> удалить
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--ink-faint)" }}>
          <ImageIcon size={28} />
          <span className="text-[13px]">Добавить фоновое фото</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ── Carousel обложек-слайдов ─────────────────────────────────────────────
export function CoverCarousel({
  recordId,
  slots,
  initialUrls,
  initialPositions,
  onSavePosition,
}: {
  recordId: string;
  slots: [CoverSlot, CoverSlot, CoverSlot];
  initialUrls: [string | null, string | null, string | null];
  initialPositions: [string, string, string];
  onSavePosition: (posField: string, pos: string) => void;
}) {
  const [covers, setCovers] = useState(initialUrls);
  const [positions, setPositions] = useState(initialPositions);
  const [active, setActive] = useState(0);
  const [, startTransition] = useTransition();
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const dragRefs = [
    useRef<{ startX: number; startY: number; startPx: number; startPy: number } | null>(null),
    useRef<{ startX: number; startY: number; startPx: number; startPy: number } | null>(null),
    useRef<{ startX: number; startY: number; startPx: number; startPy: number } | null>(null),
  ];
  const coverContainerRef = useRef<HTMLDivElement>(null);

  const filled = covers.filter(Boolean).length;
  const shownSlots = covers.map((url, i) => ({ url, idx: i })).filter((s, i) => s.url || i === filled);
  const visibleCount = Math.min(shownSlots.length, 3);

  function handleFile(slotIdx: number, file: File) {
    setCovers((prev) => { const next = [...prev] as typeof prev; next[slotIdx] = URL.createObjectURL(file); return next; });
    startTransition(() => { void uploadFile(slots[slotIdx].target, recordId, slots[slotIdx].field, file); });
    setActive(slotIdx);
  }

  function handleDelete(slotIdx: number) {
    setCovers((prev) => { const next = [...prev] as typeof prev; next[slotIdx] = null; return next; });
    startTransition(() => { void deletePhoto(slots[slotIdx].target, recordId, slots[slotIdx].field); });
    setActive(Math.max(0, slotIdx - 1));
  }

  function handleDragStart(slotIdx: number, e: React.MouseEvent) {
    e.preventDefault();
    const [px, py] = positions[slotIdx].split(" ").map(parseFloat);
    dragRefs[slotIdx].current = { startX: e.clientX, startY: e.clientY, startPx: px || 50, startPy: py || 50 };
    const compute = (me: MouseEvent) => {
      const { width, height } = coverContainerRef.current!.getBoundingClientRect();
      const dx = me.clientX - dragRefs[slotIdx].current!.startX;
      const dy = me.clientY - dragRefs[slotIdx].current!.startY;
      const newPx = Math.max(0, Math.min(100, dragRefs[slotIdx].current!.startPx - (dx / width) * 100));
      const newPy = Math.max(0, Math.min(100, dragRefs[slotIdx].current!.startPy - (dy / height) * 100));
      return `${Math.round(newPx)}% ${Math.round(newPy)}%`;
    };
    const onMove = (me: MouseEvent) => {
      if (!dragRefs[slotIdx].current || !coverContainerRef.current) return;
      const pos = compute(me);
      setPositions((prev) => { const next = [...prev] as typeof prev; next[slotIdx] = pos; return next; });
    };
    const onUp = (me: MouseEvent) => {
      if (!dragRefs[slotIdx].current || !coverContainerRef.current) return;
      const pos = compute(me);
      setPositions((prev) => { const next = [...prev] as typeof prev; next[slotIdx] = pos; return next; });
      onSavePosition(slots[slotIdx].posField, pos);
      dragRefs[slotIdx].current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const displayIdx = active < visibleCount ? active : 0;
  const currentSlot = shownSlots[displayIdx];

  return (
    <div className="relative" style={{ width: 180, height: 260 }}>
      <div
        ref={coverContainerRef}
        className="w-full h-full rounded-[10px] overflow-hidden relative"
        style={{ background: currentSlot?.url ? undefined : "var(--bg-surface-2)", border: currentSlot?.url ? "none" : "2px dashed var(--border)", cursor: currentSlot?.url ? "default" : "pointer" }}
        onClick={() => !currentSlot?.url && inputRefs[currentSlot?.idx ?? 0].current?.click()}
      >
        {currentSlot?.url ? (
          <>
            <img src={currentSlot.url} alt="" className="w-full h-full object-cover" style={{ objectPosition: positions[currentSlot.idx] }} />
            <div className="absolute inset-0 bg-black/10 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <button onMouseDown={(e) => handleDragStart(currentSlot.idx, e)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)", cursor: "grab" }} title="Зажмите и перетащите">
                <Move size={11} /> переместить
              </button>
              <button onClick={() => inputRefs[currentSlot.idx].current?.click()} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)" }}>
                <Camera size={11} /> заменить
              </button>
              <button onClick={() => handleDelete(currentSlot.idx)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,255,255,0.9)", color: "var(--ink)" }}>
                <X size={11} /> удалить
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: "var(--ink-faint)" }}>
            <ImageIcon size={22} />
            <span className="text-[11px] text-center leading-snug px-3">Добавить слайд {(currentSlot?.idx ?? 0) + 1}</span>
          </div>
        )}
        {slots.map((_, i) => (
          <input key={i} ref={inputRefs[i]} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(i, f); }} />
        ))}
      </div>

      {visibleCount > 1 && (
        <>
          <button onClick={() => setActive((a) => (a - 1 + visibleCount) % visibleCount)} className="absolute left-[-14px] top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-md" style={{ width: 26, height: 26, background: "#fff", border: "1px solid var(--border)" }}>
            <ChevronLeft size={14} style={{ color: "var(--ink)" }} />
          </button>
          <button onClick={() => setActive((a) => (a + 1) % visibleCount)} className="absolute right-[-14px] top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-md" style={{ width: 26, height: 26, background: "#fff", border: "1px solid var(--border)" }}>
            <ChevronRight size={14} style={{ color: "var(--ink)" }} />
          </button>
        </>
      )}

      {visibleCount > 1 && (
        <div className="absolute bottom-[-20px] left-0 right-0 flex justify-center gap-1.5">
          {Array.from({ length: visibleCount }).map((_, i) => (
            <button key={i} onClick={() => setActive(i)} className="rounded-full transition-all" style={{ width: i === displayIdx ? 14 : 6, height: 6, background: i === displayIdx ? "var(--accent)" : "var(--border)" }} />
          ))}
        </div>
      )}
    </div>
  );
}
