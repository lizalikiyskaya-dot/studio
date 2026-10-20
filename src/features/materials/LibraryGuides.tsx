"use client";

import { siteAlert, siteChoice } from "@/components/SiteDialog";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import ToggleSwitch from "@/components/ToggleSwitch";
import { cycleGuideStatus, setGuideVisibleForStudent } from "@/features/guides/actions";
import type { CabinetGuide } from "@/features/guides/types";
import DownloadButton from "@/components/DownloadButton";
import ReadingText from "@/components/ReadingText";
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
      await siteAlert(result.error);
    }
  }

  async function handleVisible(id: string, visible: boolean) {
    const current = guides.find((guide) => guide.id === id)?.visible ?? false;
    if (visible) {
      const choice = await siteChoice("Отправить уведомление на почту?", {
        yes: "Отправить",
        no: "Не отправлять",
      });
      if (choice === "dismiss") return;
      patch(id, { visible: true });
      const result = await setGuideVisibleForStudent(id, studentId, true, choice === "yes");
      if (!result.ok) {
        patch(id, { visible: current });
        await siteAlert(result.error);
      }
      return;
    }

    patch(id, { visible: false });
    const result = await setGuideVisibleForStudent(id, studentId, false);
    if (!result.ok) {
      patch(id, { visible: current });
      await siteAlert(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {guides.map((guide, index) => {
        const canFetch = canManage || guide.visible;
        return (
          <article
            key={guide.id}
            className="guide-card rounded-[24px] px-4 py-3.5"
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h3 className="heading min-w-0 flex-1 text-[17px] font-semibold">{guide.title || "Без названия"}</h3>
              <button
                type="button"
                onClick={() => void handleStatus(guide.id, guide.status)}
                className="text-[12px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
                style={MATERIAL_STATUS_STYLE[guide.status]}
              >
                {MATERIAL_STATUS_LABEL[guide.status]}
              </button>
            </div>

            {guide.description ? <ReadingText text={guide.description} className="mt-3" /> : null}

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {canFetch && guide.hasFile ? (
                <DownloadButton
                  href={`/api/guides/${guide.id}/file`}
                  fileName={guide.fileName}
                  mime={guide.fileMime}
                  bytes={guide.fileBytes}
                />
              ) : (
                <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                  файл пока не загружен
                </span>
              )}
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
