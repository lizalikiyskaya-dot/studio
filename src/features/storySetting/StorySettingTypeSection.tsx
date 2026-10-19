"use client";

import { useState, useTransition } from "react";
import type { Story } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import SettingMixPanel from "@/features/setting/SettingMixPanel";
import { resolveShares } from "@/features/setting/settingMix";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { saveStorySettingMix } from "./actions";

export default function StorySettingTypeSection({ story }: { story: Story }) {
  const [photoUrl, setPhotoUrl] = useState(story.settingPhotoUrl);
  const [, startTransition] = useTransition();

  return (
    <section className="rounded-[24px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <h2 className="text-[17px] font-semibold">Тип сеттинга</h2>
      <div className="mt-3">
        <SettingMixPanel
          initial={resolveShares(story)}
          actions={{
            save: (shares) => saveStorySettingMix(story.id, shares),
            accept: async () => {},
            reject: async () => {},
          }}
        />
      </div>
      <ImageUploadBox
        value={photoUrl}
        onUpload={(file) => {
          setPhotoUrl(URL.createObjectURL(file));
          startTransition(() => { void uploadFile("story-setting-photo", story.id, "settingPhotoUrl", file); });
        }}
        onDelete={() => {
          setPhotoUrl(null);
          startTransition(() => { void deletePhoto("story-setting-photo", story.id, "settingPhotoUrl"); });
        }}
        placeholder="фото настроения"
        className="mt-4 h-[220px] w-full rounded-[14px]"
      />
    </section>
  );
}
