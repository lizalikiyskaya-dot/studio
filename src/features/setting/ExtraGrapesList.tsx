"use client";

import { siteConfirm } from "@/components/SiteDialog";

import { useState, useTransition } from "react";
import type { GrapesSetting } from "@/generated/prisma/client";
import SuggestableField from "@/features/suggestions/SuggestableField";
import { Button } from "@/components/ui/Button";
import GrapesTable from "./GrapesTable";
import { createGrapesSetting, deleteGrapesSetting } from "./actions";

export default function ExtraGrapesList({
  bookId,
  initialSettings,
  suggestions,
}: {
  bookId: string;
  initialSettings: GrapesSetting[];
  suggestions: Record<string, Record<string, string>>;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const setting = await createGrapesSetting(bookId);
      setSettings((prev) => [...prev, setting]);
    });
  }

  async function handleDelete(id: string) {
    if (!(await siteConfirm("Удалить этот сеттинг?"))) return;
    setSettings((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteGrapesSetting(id));
  }

  return (
    <div>
      {settings.map((setting, i) => (
        <div key={setting.id} className="mt-10">
          <div className="flex items-center gap-3 mb-2">
            <SuggestableField
              model="GrapesSetting"
              recordId={setting.id}
              field="title"
              value={setting.title.trim() ? setting.title : `Сеттинг ${i + 2}`}
              suggestion={suggestions[setting.id]?.title}
              as="input"
              className="heading flex-1 outline-none bg-transparent text-[16px] font-semibold border-b pb-1"
              style={{ borderColor: "var(--rule)" }}
              onSaved={(title) => setSettings((prev) => prev.map((row) => (row.id === setting.id ? { ...row, title } : row)))}
            />
            <Button onClick={() => handleDelete(setting.id)} variant="secondary" size="sm" pill>
              удалить
            </Button>
          </div>
          <GrapesTable
            model="GrapesSetting"
            recordId={setting.id}
            values={setting}
            suggestions={suggestions[setting.id] ?? {}}
          />
        </div>
      ))}

      <div className="mt-6">
        <Button onClick={handleAdd} variant="dashed" size="sm" pill>
          + добавить сеттинг
        </Button>
      </div>
    </div>
  );
}
