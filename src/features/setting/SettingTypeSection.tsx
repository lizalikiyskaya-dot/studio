"use client";

import { useState, useTransition } from "react";
import type { Book } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import SettingTypeMap from "@/components/SettingTypeMap";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { updateBookSettingMap } from "./actions";

export default function SettingTypeSection({ bookId, book }: { bookId: string; book: Book }) {
  const [photoUrl, setPhotoUrl] = useState(book.settingPhotoUrl);
  const [, startTransition] = useTransition();

  return (
    <div>
      <ImageUploadBox
        value={photoUrl}
        onUpload={(file) => {
          setPhotoUrl(URL.createObjectURL(file));
          startTransition(() => { void uploadFile("setting-photo", bookId, "settingPhotoUrl", file); });
        }}
        onDelete={() => {
          setPhotoUrl(null);
          startTransition(() => { void deletePhoto("setting-photo", bookId, "settingPhotoUrl"); });
        }}
        placeholder="нажмите, чтобы добавить фото настроения"
        className="w-full max-w-[420px] h-[170px] rounded-md mb-5"
      />

      <SettingTypeMap
        x={book.settingMapX}
        y={book.settingMapY}
        onSave={(x, y) => startTransition(() => updateBookSettingMap(bookId, x, y))}
      />
    </div>
  );
}
