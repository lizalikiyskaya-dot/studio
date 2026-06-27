"use client";

import { useTransition } from "react";
import type { Cycle } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { updateCycleField, type CycleField } from "./actions";

function Field({ label, value, field, cycleId }: { label: string; value: string; field: CycleField; cycleId: string }) {
  const [, startTransition] = useTransition();
  return (
    <div className="mb-5">
      <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
        {label}
      </label>
      <input
        defaultValue={value}
        onBlur={(e) => startTransition(() => updateCycleField(cycleId, field, e.target.value))}
        className="w-full border-b py-1.5 text-[15px] outline-none bg-transparent"
        style={{ borderColor: "var(--rule)" }}
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  field,
  cycleId,
  minHeight = 60,
}: {
  label: string;
  value: string;
  field: CycleField;
  cycleId: string;
  minHeight?: number;
}) {
  const [, startTransition] = useTransition();
  return (
    <div className="mb-5 max-w-[680px]">
      <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
        {label}
      </label>
      <AutoGrowTextarea
        defaultValue={value}
        onBlur={(value) => startTransition(() => updateCycleField(cycleId, field, value))}
        style={{ borderColor: "var(--rule)", minHeight }}
        className="w-full border-b py-1.5 text-[14px] outline-none bg-transparent"
      />
    </div>
  );
}

export default function AboutCycleForm({ cycle }: { cycle: Cycle }) {
  const [, startTransition] = useTransition();

  return (
    <div>
      <ImageUploadBox
        value={cycle.coverUrl}
        onUpload={(file) => startTransition(() => { void uploadFile("cycle-cover", cycle.id, "coverUrl", file); })}
        onDelete={() => startTransition(() => { void deletePhoto("cycle-cover", cycle.id, "coverUrl"); })}
        placeholder="нажмите, чтобы добавить обложку"
        className="rounded-sm mb-6"
        style={{ width: 140, height: 200 }}
      />

      <div className="grid grid-cols-2 gap-x-8">
        <Field label="Название цикла" value={cycle.title} field="title" cycleId={cycle.id} />
        <Field label="Жанр" value={cycle.genre} field="genre" cycleId={cycle.id} />
      </div>

      <TextAreaField label="Концепт" value={cycle.concept} field="concept" cycleId={cycle.id} />
      <TextAreaField label="Аннотация" value={cycle.annotation} field="annotation" cycleId={cycle.id} minHeight={80} />
    </div>
  );
}
