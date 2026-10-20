"use client";

import type { Book } from "@/generated/prisma/client";
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
  return <SettingMixPanel bookId={bookId} initial={resolveShares(book)} suggestion={suggestion} />;
}
