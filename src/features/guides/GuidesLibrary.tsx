"use client";

import { siteAlert, siteChoice, siteConfirm } from "@/components/SiteDialog";

import { useState } from "react";
import { ChevronDown, GripVertical } from "lucide-react";
import Collapse from "@/components/Collapse";
import { Button } from "@/components/ui/Button";
import DownloadButton from "@/components/DownloadButton";
import { Badge } from "@/components/ui/Badge";
import EmptyState from "@/components/EmptyState";
import { useDragReorder } from "@/lib/useDragReorder";
import {
  createGuide,
  deleteGuide,
  reorderGuides,
  setGuideVisibleForAll,
  updateGuideDescription,
  updateGuideTitle,
} from "./actions";
import type { LibraryGuide } from "./types";

async function uploadGuideFile(id: string, file: File): Promise<{ fileName: string; mime: string }> {
  const formData = new FormData();
  formData.set("target", "guide");
  formData.set("id", id);
  formData.set("field", "file");
  formData.set("file", file);
  const res = await fetch("/api/file-upload", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Не удалось загрузить файл");
  return { fileName: String(data.fileName ?? file.name), mime: String(data.mime ?? "") };
}

export default function GuidesLibrary({
  initialGuides,
  studentCount,
}: {
  initialGuides: LibraryGuide[];
  studentCount: number;
}) {
  const [guides, setGuides] = useState(initialGuides);
  const [busy, setBusy] = useState(false);
  const [shownIds, setShownIds] = useState<Record<string, boolean>>({});
  const [descOpen, setDescOpen] = useState<Record<string, boolean>>({});
  const { dropTarget, dragHandle } = useDragReorder(guides, setGuides, (ids) => {
    void reorderGuides(ids).then(async (result) => {
      if (!result.ok) await siteAlert(result.error);
    });
  });

  async function handleAdd() {
    setBusy(true);
    const result = await createGuide();
    setBusy(false);
    if (!result.ok) {
      await siteAlert(result.error);
      return;
    }
    setGuides((prev) => [...prev, result.guide]);
  }

  function patch(id: string, partial: Partial<LibraryGuide>) {
    setGuides((prev) => prev.map((guide) => (guide.id === id ? { ...guide, ...partial } : guide)));
  }

  async function saveTitle(id: string, title: string) {
    const result = await updateGuideTitle(id, title);
    if (!result.ok) await siteAlert(result.error);
  }

  async function saveDescription(id: string, description: string) {
    const result = await updateGuideDescription(id, description);
    if (!result.ok) await siteAlert(result.error);
  }

  async function handleFile(id: string, file: File) {
    if (file.size > 8 * 1024 * 1024) {
      await siteAlert("Файл слишком большой (максимум 8 МБ)");
      return;
    }
    try {
      const uploaded = await uploadGuideFile(id, file);
      patch(id, {
        fileName: uploaded.fileName,
        fileMime: uploaded.mime,
        fileBytes: file.size,
        hasFile: true,
        isPdf: uploaded.mime === "application/pdf",
      });
    } catch (error) {
      await siteAlert(error instanceof Error ? error.message : "Не удалось загрузить файл");
    }
  }

  async function handleAll(id: string, visible: boolean) {
    let notify = false;
    if (!visible) {
      if (!(await siteConfirm("Скрыть эту методичку у всех учеников? Скачать её они больше не смогут."))) return;
    } else {
      const choice = await siteChoice("Отправить уведомление на почту?", {
        yes: "Отправить",
        no: "Не отправлять",
      });
      if (choice === "dismiss") return;
      notify = choice === "yes";
    }
    const result = await setGuideVisibleForAll(id, visible, notify);
    if (!result.ok) {
      await siteAlert(result.error);
      return;
    }
    patch(id, { visibleCount: result.visibleCount, openedStudents: result.openedStudents });
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить методичку из библиотеки? У учеников она тоже пропадёт. Личные файлы учеников останутся."))) return;
    const previous = guides;
    setGuides((prev) => prev.filter((guide) => guide.id !== id));
    const result = await deleteGuide(id);
    if (!result.ok) {
      setGuides(previous);
      await siteAlert(result.error);
    }
  }

  return (
    <div>
      {guides.length === 0 && (
        <div className="mb-4">
          <EmptyState
            cue="Самое время поделиться методичкой"
            detail="Файл, название и пара слов, о чём она."
          />
        </div>
      )}

      {guides.map((guide, index) => {
        const opened = guide.visibleCount > 0;
        const shown = shownIds[guide.id] ?? false;
        const descriptionOpen = descOpen[guide.id] ?? false;
        return (
          <article
            key={guide.id}
            {...dropTarget(guide.id)}
            className="guide-card rounded-[18px] px-3.5 py-3 mb-2.5"
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
          >
            <div className="flex items-start gap-1.5">
              <span
                {...dragHandle(guide.id)}
                className="mt-1.5 cursor-grab shrink-0"
                style={{ color: "var(--muted)" }}
                title="Перетащить, чтобы изменить порядок"
              >
                <GripVertical size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <input
                  value={guide.title}
                  onChange={(event) => patch(guide.id, { title: event.target.value })}
                  onBlur={(event) => void saveTitle(guide.id, event.target.value)}
                  placeholder="Название методички"
                  maxLength={200}
                  className="heading w-full bg-transparent outline-none text-[17px] font-semibold leading-snug"
                />
                <div className="guide-desc">
                  <button
                    type="button"
                    className="entry-note-toggle guide-desc-toggle"
                    aria-expanded={descriptionOpen}
                    onClick={() => setDescOpen((prev) => ({ ...prev, [guide.id]: !descriptionOpen }))}
                  >
                    <ChevronDown size={15} aria-hidden="true" className={`chevron-turn${descriptionOpen ? " is-open" : ""}`} />
                    Описание
                    {guide.description.trim() ? <span className="entry-note-dot" aria-hidden="true" /> : null}
                  </button>
                  <Collapse open={descriptionOpen}>
                    <textarea
                      value={guide.description}
                      onChange={(event) => patch(guide.id, { description: event.target.value })}
                      onBlur={(event) => void saveDescription(guide.id, event.target.value)}
                      placeholder="Коротко, о чём методичка"
                      maxLength={1000}
                      rows={2}
                      className="fld guide-desc-field"
                    />
                  </Collapse>
                </div>

                <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                  <label
                    className="text-[13px] px-3 h-7 rounded-full cursor-pointer inline-flex items-center"
                    style={{ color: "var(--ink)", background: "var(--y)", fontWeight: 600 }}
                  >
                    {guide.hasFile ? "Заменить файл" : "Загрузить файл"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.epub,.doc,.docx,.odt,.rtf,.txt,application/pdf,text/plain"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void handleFile(guide.id, file);
                      }}
                    />
                  </label>
                  {guide.hasFile ? (
                    <DownloadButton
                      href={`/api/guides/${guide.id}/file`}
                      fileName={guide.fileName}
                      mime={guide.fileMime}
                      bytes={guide.fileBytes}
                    />
                  ) : (
                    <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                      PDF, EPUB, Word, RTF или текст, до 8 МБ
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge tone={opened ? "mint" : "neutral"}>{opened ? "открыта" : "скрыта"}</Badge>
                  <span className="text-[13px]" style={{ color: "var(--ink2)" }}>
                    {studentCount === 0
                      ? "учеников пока нет"
                      : `у ${guide.visibleCount} из ${studentCount}`}
                  </span>
                  {studentCount > 0 ? (
                    <button
                      type="button"
                      className="lnk text-[13px]"
                      onClick={() => setShownIds((prev) => ({ ...prev, [guide.id]: !shown }))}
                    >
                      {shown ? "скрыть" : "показать"}
                    </button>
                  ) : null}
                </div>
                {shown ? (
                  <div className="mt-2 flex flex-col gap-1 text-[13.5px]" style={{ color: "var(--ink)" }}>
                    {guide.openedStudents.length === 0 ? (
                      <span style={{ color: "var(--muted)" }}>Пока никому не открыта</span>
                    ) : (
                      guide.openedStudents.map((student) => <span key={student.id}>{student.name}</span>)
                    )}
                  </div>
                ) : null}

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Button type="button" variant="primary" size="sm" pill onClick={() => void handleAll(guide.id, true)}>
                    Показать всем
                  </Button>
                  <Button type="button" variant="secondary" size="sm" pill onClick={() => void handleAll(guide.id, false)}>
                    Скрыть у всех
                  </Button>
                  <Button type="button" variant="secondary" size="sm" pill onClick={() => void handleDelete(guide.id)}>
                    Удалить
                  </Button>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      <Button type="button" variant="primary" pill onClick={() => void handleAdd()} disabled={busy}>
        Добавить методичку
      </Button>
    </div>
  );
}
