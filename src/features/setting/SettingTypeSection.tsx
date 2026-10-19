"use client";

import { useState, useTransition } from "react";
import type { Book } from "@/generated/prisma/client";
import ImageUploadBox from "@/components/ImageUploadBox";
import { uploadFile, deletePhoto } from "@/lib/uploadFile";
import { resolveShares } from "./settingMix";
import SettingMixPanel from "./SettingMixPanel";

export default function SettingTypeSection({
  bookId,
  book,
  suggestion,
}: {
  bookId: string;
  book: Book;
  suggestion?: string | null;
}) {
  const [photoUrl, setPhotoUrl] = useState(book.settingPhotoUrl);
  const [, startTransition] = useTransition();

  return (
    <section className="rounded-[24px] p-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <h2 className="text-[17px] font-semibold">Тип сеттинга</h2>
      <div className="mt-3">
        <SettingMixPanel bookId={bookId} initial={resolveShares(book)} suggestion={suggestion} />
      </div>
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
        placeholder="фото настроения"
        className="mt-4 h-[220px] w-full rounded-[14px]"
      />
    </section>
  );
}
