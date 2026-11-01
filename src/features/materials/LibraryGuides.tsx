"use client";

import { siteAlert, siteChoice, siteConfirm } from "@/components/SiteDialog";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import ToggleSwitch from "@/components/ToggleSwitch";
import { cycleGuideStatus, setGuideVisibleForStudent } from "@/features/guides/actions";
import type { CabinetGuide } from "@/features/guides/types";
import DownloadButton from "@/components/DownloadButton";
import ReadingText from "@/components/ReadingText";
import { buyMethodicals } from "@/features/shop/actions";
import { confirmPurchase, METHODICAL_PRICE, openedLine } from "@/features/shop/prices";
import { MATERIAL_STATUS_LABEL, MATERIAL_STATUS_STYLE, nextMaterialStatus } from "./status";

export default function LibraryGuides({
  studentId,
  guides: initialGuides,
  canManage,
  starBalance = 0,
}: {
  studentId: string;
  guides: CabinetGuide[];
  canManage: boolean;
  starBalance?: number;
}) {
  const [guides, setGuides] = useState(initialGuides);
  const [balance, setBalance] = useState(starBalance);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

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

  async function buy(guide: CabinetGuide) {
    if (canManage || guide.visible || busyId) return;
    const ok = await siteConfirm(confirmPurchase(METHODICAL_PRICE, balance - METHODICAL_PRICE, [guide.title || "Методичка"]));
    if (!ok) return;
    setBusyId(guide.id);
    const result = await buyMethodicals([guide.id]);
    setBusyId(null);
    if (!result.ok) {
      await siteAlert(result.error);
      return;
    }
    setBalance(result.balance);
    patch(guide.id, { visible: true });
    setNotice(openedLine([guide.title || "Методичка"]));
  }

  return (
    <div className="flex flex-col gap-3">
      {notice ? <p className="text-[14.5px]">{notice}</p> : null}
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
              {canFetch ? (
                <button
                  type="button"
                  onClick={() => void handleStatus(guide.id, guide.status)}
                  className="text-[12px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer"
                  style={MATERIAL_STATUS_STYLE[guide.status]}
                >
                  {MATERIAL_STATUS_LABEL[guide.status]}
                </button>
              ) : null}
            </div>

            {guide.description ? <ReadingText text={guide.description} className="mt-3" /> : null}

            {!canManage && !guide.visible ? (
              <div className="mt-3">
                <p className="text-[13.5px]" style={{ color: "var(--muted)" }}>
                  Закрыто. Вы можете открыть её за {METHODICAL_PRICE} звёзд.
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-full px-4 h-8 text-[13.5px] font-semibold"
                  style={{ background: "var(--y)", color: "var(--ink)" }}
                  disabled={busyId !== null}
                  onClick={() => void buy(guide)}
                >
                  Купить за звёзды
                </button>
              </div>
            ) : null}

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {canFetch && guide.hasFile ? (
                <DownloadButton
                  href={`/api/guides/${guide.id}/file`}
                  fileName={guide.fileName}
                  mime={guide.fileMime}
                  bytes={guide.fileBytes}
                />
              ) : canFetch ? (
                <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                  файл пока не загружен
                </span>
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
