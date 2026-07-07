"use client";

import { useState, useTransition } from "react";
import type { Story } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import SettingTypeMap from "@/components/SettingTypeMap";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { updateStorySettingMap } from "./actions";

export default function StorySettingTypeSection({ story }: { story: Story }) {
  const [photoUrl, setPhotoUrl] = useState(story.settingPhotoUrl);
  const [, startTransition] = useTransition();

  return (
    <div>
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
        placeholder="нажмите, чтобы добавить фото настроения"
        className="w-full max-w-[420px] h-[170px] rounded-md mb-5"
      />
      <SettingTypeMap
        x={story.settingMapX}
        y={story.settingMapY}
        onSave={(x, y) => startTransition(() => updateStorySettingMap(story.id, x, y))}
      />
    </div>
  );
}
