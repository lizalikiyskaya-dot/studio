"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import ToggleSwitch from "@/components/ToggleSwitch";
import { cycleGuideStatus, setGuideVisibleForStudent } from "@/features/guides/actions";
import type { CabinetGuide } from "@/features/guides/types";
import DownloadButton from "@/components/DownloadButton";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_STYLE, nextMaterialStatus } from "./status";

export default function LibraryGuides({
  studentId,
  guides: initialGuides,
  canManage,
}: {
  studentId: string;
  guides: CabinetGuide[];
  canManage: boolean;
}) {
  const [guides, setGuides] = useState(initialGuides);

  function patch(id: string, partial: Partial<CabinetGuide>) {
    setGuides((prev) => prev.map((guide) => (guide.id === id ? { ...guide, ...partial } : guide)));
  }

  async function handleStatus(id: string, current: CabinetGuide["status"]) {
    const next = nextMaterialStatus(current);
    patch(id, { status: next });
    const result = await cycleGuideStatus(id, studentId);
    if (!result.ok) {
      patch(id, { status: current });
      window.alert(result.error);
    }
  }

  async function handleVisible(id: string, visible: boolean) {
    const current = guides.find((guide) => guide.id === id)?.visible ?? false;
    patch(id, { visible });
    const result = await setGuideVisibleForStudent(id, studentId, visible);
    if (!result.ok) {
      patch(id, { visible: current });
      window.alert(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {guides.map((guide) => {
        const canFetch = canManage || guide.visible;
        return (
          <article
            key={guide.id}
            className="hover-lift rounded-[24px] px-4 py-3.5"
            style={{ background: "#fff", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="heading text-[17px] font-semibold">{guide.title || "Без названия"}</div>
                {guide.description ? (
                  <p className="mt-1 text-[13.5px] whitespace-pre-wrap" style={{ color: "var(--ink2)" }}>
                    {guide.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleStatus(guide.id, guide.status)}
                className="text-[12px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
                style={MATERIAL_STATUS_STYLE[guide.status]}
              >
                {MATERIAL_STATUS_LABEL[guide.status]}
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {canFetch && guide.hasFile ? (
                <DownloadButton
                  href={`/api/guides/${guide.id}/file`}
                  fileName={guide.fileName}
                  mime={guide.fileMime}
                  bytes={guide.fileBytes}
                />
              ) : null}
              {canFetch && guide.isPdf ? (
                <Link
                  href={canManage ? `/mentor/guides/${guide.id}` : `/dashboard/guides/${guide.id}`}
                  className="lnk text-[13.5px]"
                >
                  открыть
                </Link>
              ) : null}
              {canManage ? (
                <span className="inline-flex items-center gap-2 ml-auto">
                  <ToggleSwitch checked={guide.visible} onChange={(checked) => void handleVisible(guide.id, checked)} />
                  <Badge tone={guide.visible ? "mint" : "neutral"}>{guide.visible ? "открыта" : "скрыта"}</Badge>
                </span>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
