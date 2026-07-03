"use client";

import { useTransition } from "react";
import type { Cycle } from "@/generated/prisma/client";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import { BannerSection, CoverCarousel } from "@/components/ProfilePhotos";
import { updateCycleField, updateCyclePhotoPosition, type CycleField } from "./actions";

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
      <div className="mb-8 rounded-[14px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <BannerSection
          recordId={cycle.id}
          target="cycle-banner"
          field="bannerUrl"
          initialUrl={cycle.bannerUrl ?? null}
          initialPosition={cycle.bannerPosition ?? "50% 50%"}
          onSavePosition={(pos) => startTransition(() => { void updateCyclePhotoPosition(cycle.id, "bannerPosition", pos); })}
        />
        <div className="px-6 pb-6 pt-8 flex gap-8 items-start">
          <CoverCarousel
            recordId={cycle.id}
            slots={[
              { target: "cycle-cover", field: "coverUrl", posField: "coverPosition" },
              { target: "cycle-cover-2", field: "coverUrl2", posField: "coverPosition2" },
              { target: "cycle-cover-3", field: "coverUrl3", posField: "coverPosition3" },
            ]}
            initialUrls={[cycle.coverUrl ?? null, cycle.coverUrl2 ?? null, cycle.coverUrl3 ?? null]}
            initialPositions={[cycle.coverPosition ?? "50% 50%", cycle.coverPosition2 ?? "50% 50%", cycle.coverPosition3 ?? "50% 50%"]}
            onSavePosition={(posField, pos) => startTransition(() => { void updateCyclePhotoPosition(cycle.id, posField as "coverPosition" | "coverPosition2" | "coverPosition3", pos); })}
          />
          <div className="flex-1 min-w-0 pt-1">
            <Field label="Название цикла" value={cycle.title} field="title" cycleId={cycle.id} />
            <Field label="Жанр" value={cycle.genre} field="genre" cycleId={cycle.id} />
          </div>
        </div>
      </div>

      <TextAreaField label="Концепт" value={cycle.concept} field="concept" cycleId={cycle.id} />
      <TextAreaField label="Аннотация" value={cycle.annotation} field="annotation" cycleId={cycle.id} minHeight={80} />
    </div>
  );
}
