"use client";

import { useState, useTransition } from "react";
import ImageUploadBox from "@/components/ImageUploadBox";
import { deletePhoto, uploadFile } from "@/lib/uploadFile";

type PhotoKind = "setting-photo" | "cycle-setting-photo" | "story-setting-photo";

export default function SettingPhotoBanner({
  recordId,
  photoUrl,
  canEdit,
  kind,
}: {
  recordId: string;
  photoUrl: string | null;
  canEdit: boolean;
  kind: PhotoKind;
}) {
  const [url, setUrl] = useState(photoUrl);
  const [, startTransition] = useTransition();

  if (!canEdit) {
    if (!url) return null;
    return (
      <div
        className="setting-banner"
        role="img"
        aria-label="Фото сеттинга"
        style={{ backgroundImage: `url(${url})`, border: "1px solid var(--border)" }}
      />
    );
  }

  return (
    <ImageUploadBox
      value={url}
      placeholder="фото сеттинга"
      className="setting-banner"
      onUpload={(file) => {
        setUrl(URL.createObjectURL(file));
        startTransition(() => { void uploadFile(kind, recordId, "settingPhotoUrl", file); });
      }}
      onDelete={() => {
        setUrl(null);
        startTransition(() => { void deletePhoto(kind, recordId, "settingPhotoUrl"); });
      }}
    />
  );
}
