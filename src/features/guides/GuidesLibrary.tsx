"use client";

import { useState } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDragReorder } from "@/lib/useDragReorder";
import {
  createGuide,
  deleteGuide,
  reorderGuides,
  setGuideNotify,
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
  const { dropTarget, dragHandle } = useDragReorder(guides, setGuides, (ids) => {
    void reorderGuides(ids).then((result) => {
      if (!result.ok) window.alert(result.error);
    });
  });

  async function handleAdd() {
    setBusy(true);
    const result = await createGuide();
    setBusy(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setGuides((prev) => [...prev, result.guide]);
  }

  function patch(id: string, partial: Partial<LibraryGuide>) {
    setGuides((prev) => prev.map((guide) => (guide.id === id ? { ...guide, ...partial } : guide)));
  }

  async function saveTitle(id: string, title: string) {
    const result = await updateGuideTitle(id, title);
    if (!result.ok) window.alert(result.error);
  }

  async function saveDescription(id: string, description: string) {
    const result = await updateGuideDescription(id, description);
    if (!result.ok) window.alert(result.error);
  }

  async function handleFile(id: string, file: File) {
    if (file.size > 8 * 1024 * 1024) {
      window.alert("Файл слишком большой (максимум 8 МБ)");
      return;
    }
    try {
      const uploaded = await uploadGuideFile(id, file);
      patch(id, {
        fileName: uploaded.fileName,
        hasFile: true,
        isPdf: uploaded.mime === "application/pdf",
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Не удалось загрузить файл");
    }
  }

  async function handleNotify(id: string, notifyOnOpen: boolean) {
    patch(id, { notifyOnOpen });
    const result = await setGuideNotify(id, notifyOnOpen);
    if (!result.ok) {
      patch(id, { notifyOnOpen: !notifyOnOpen });
      window.alert(result.error);
    }
  }

  async function handleAll(id: string, visible: boolean) {
    if (!visible && !window.confirm("Скрыть эту методичку у всех учеников? Скачать её они больше не смогут.")) return;
    const result = await setGuideVisibleForAll(id, visible);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    patch(id, { visibleCount: result.visibleCount });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Удалить методичку из библиотеки? У учеников она тоже пропадёт. Личные файлы учеников останутся.")) return;
    const previous = guides;
    setGuides((prev) => prev.filter((guide) => guide.id !== id));
    const result = await deleteGuide(id);
    if (!result.ok) {
      setGuides(previous);
      window.alert(result.error);
    }
  }

  return (
    <div>
      {guides.length === 0 && (
        <p className="text-[14.5px] mb-4" style={{ color: "var(--muted)" }}>
          Пока пусто. Добавьте первую методичку — файл, название и пара слов, о чём она.
        </p>
      )}

      {guides.map((guide) => {
        const opened = guide.visibleCount > 0;
        return (
          <article
            key={guide.id}
            {...dropTarget(guide.id)}
            className="rounded-[24px] px-5 py-4 mb-4"
            style={{ background: "#fff", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start gap-2">
              <span
                {...dragHandle(guide.id)}
                className="mt-3 cursor-grab shrink-0"
                style={{ color: "var(--muted)" }}
                title="Перетащить, чтобы изменить порядок"
              >
                <GripVertical size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <input
                  value={guide.title}
                  onChange={(event) => patch(guide.id, { title: event.target.value })}
                  onBlur={(event) => void saveTitle(guide.id, event.target.value)}
                  placeholder="Название методички"
                  maxLength={200}
                  className="heading w-full bg-transparent outline-none text-[20px] font-semibold"
                />
                <textarea
                  value={guide.description}
                  onChange={(event) => patch(guide.id, { description: event.target.value })}
                  onBlur={(event) => void saveDescription(guide.id, event.target.value)}
                  placeholder="Коротко, о чём методичка"
                  maxLength={1000}
                  rows={2}
                  className="fld mt-2"
                />

                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <label
                    className="text-[13.5px] px-4 h-8 rounded-full cursor-pointer inline-flex items-center"
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
                    <>
                      <a href={`/api/guides/${guide.id}/file`} className="lnk text-[13.5px]">
                        скачать{guide.fileName ? ` · ${guide.fileName}` : ""}
                      </a>
                      {guide.isPdf ? (
                        <Link href={`/mentor/guides/${guide.id}`} className="lnk text-[13.5px]">
                          открыть
                        </Link>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[13px]" style={{ color: "var(--muted)" }}>
                      PDF, EPUB, Word, RTF или текст, до 8 МБ
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Badge tone={opened ? "success" : "neutral"}>{opened ? "открыта" : "скрыта"}</Badge>
                  <span className="text-[13px]" style={{ color: "var(--ink2)" }}>
                    {studentCount === 0
                      ? "учеников пока нет"
                      : `у ${guide.visibleCount} из ${studentCount}`}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
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

                <label className="mt-4 flex items-start gap-2 text-[13.5px] cursor-pointer" style={{ color: "var(--ink2)" }}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={guide.notifyOnOpen}
                    onChange={(event) => void handleNotify(guide.id, event.target.checked)}
                  />
                  <span>
                    Письмо ученику, когда методичка открывается
                    <span className="block text-[12.5px]" style={{ color: "var(--muted)" }}>
                      {guide.notifyOnOpen
                        ? "Письмо уйдёт один раз, когда методичка станет видна. Кому уже открыто — повторно не пишем."
                        : "Сейчас письма нет. Если отметить, оно уйдёт в момент открытия."}
                    </span>
                  </span>
                </label>
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
