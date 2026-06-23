"use client";

import { useState, useTransition } from "react";
import type { Storyline } from "@/generated/prisma/client";
import { createStoryline, updateStorylineField, updateStorylineColor, deleteStoryline, type StorylineColor } from "./actions";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";

const GRID_COLUMNS = "28px 2fr 1.4fr 1.6fr 24px";

const COLOR_SWATCHES: { value: StorylineColor; hex: string; label: string }[] = [
  { value: "pink", hex: "#F6D9DE", label: "Розовый" },
  { value: "ochre", hex: "#F0DDB0", label: "Охра" },
  { value: "blue", hex: "#D3E3EF", label: "Голубой" },
  { value: "lavender", hex: "#E1D9EF", label: "Сиреневый" },
];

function colorHex(color: string | null): string | undefined {
  return COLOR_SWATCHES.find((c) => c.value === color)?.hex;
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: StorylineColor | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative pt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-5 h-5 rounded-full"
        style={{ background: colorHex(value) ?? "transparent", border: "1px solid var(--rule)" }}
        title="Цвет строки"
      />
      {open && (
        <div
          className="absolute z-10 flex gap-1.5 p-2 rounded-md mt-1"
          style={{ background: "#fff", border: "1px solid var(--rule)" }}
        >
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-5 h-5 rounded-full"
            style={{ border: "1px solid var(--rule)" }}
            title="Без цвета"
          />
          {COLOR_SWATCHES.map((c) => (
            <button
              key={c.value}
              onClick={() => {
                onChange(c.value);
                setOpen(false);
              }}
              className="w-5 h-5 rounded-full"
              style={{ background: c.hex, border: "1px solid var(--rule)" }}
              title={c.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StorylinesTable({
  bookId,
  initialStorylines,
}: {
  bookId: string;
  initialStorylines: Storyline[];
}) {
  const [storylines, setStorylines] = useState(initialStorylines);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const storyline = await createStoryline(bookId);
      setStorylines((prev) => [...prev, storyline]);
    });
  }

  function handleField(id: string, field: "name" | "chapters" | "status", value: string) {
    setStorylines((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    startTransition(() => updateStorylineField(id, field, value));
  }

  function handleColor(id: string, color: StorylineColor | null) {
    setStorylines((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)));
    startTransition(() => {
      updateStorylineColor(id, color);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Удалить линию?")) return;
    startTransition(async () => {
      await deleteStoryline(id);
      setStorylines((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div>
      <div className="overflow-x-auto mb-4">
        <div style={{ minWidth: 620 }}>
          <div
            className="grid gap-x-3 pb-2 border-b"
            style={{ gridTemplateColumns: GRID_COLUMNS, borderColor: "var(--rule)" }}
          >
            {["", "Линия", "Через какие главы проходит", "Статус развития", ""].map((h, i) => (
              <div key={i} className="font-mono-label text-[10px] uppercase whitespace-nowrap" style={{ color: "var(--faded)" }}>
                {h}
              </div>
            ))}
          </div>

          {storylines.map((s) => (
            <div
              key={s.id}
              className="grid gap-x-3 py-2.5 border-b items-start"
              style={{
                gridTemplateColumns: GRID_COLUMNS,
                borderColor: "var(--rule)",
                background: colorHex(s.color) ? `${colorHex(s.color)}55` : undefined,
              }}
            >
              <ColorPicker value={s.color} onChange={(c) => handleColor(s.id, c)} />
              <AutoGrowTextarea
                defaultValue={s.name}
                onBlur={(v) => handleField(s.id, "name", v)}
                className="w-full min-w-0 outline-none bg-transparent text-[13.5px] py-1 leading-snug"
              />
              <AutoGrowTextarea
                defaultValue={s.chapters}
                onBlur={(v) => handleField(s.id, "chapters", v)}
                className="w-full min-w-0 outline-none bg-transparent text-[13.5px] py-1 leading-snug"
              />
              <AutoGrowTextarea
                defaultValue={s.status}
                onBlur={(v) => handleField(s.id, "status", v)}
                className="w-full min-w-0 outline-none bg-transparent text-[13.5px] py-1 leading-snug"
              />
              <button
                onClick={() => handleDelete(s.id)}
                className="font-mono-label text-[9px] pt-1.5"
                style={{ color: "var(--wine)" }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleAdd}
        className="font-mono-label text-[11px] px-3 py-1.5 rounded-sm"
        style={{ color: "var(--wine)", border: "1px dashed var(--wine-soft)" }}
      >
        + линия
      </button>
    </div>
  );
}
