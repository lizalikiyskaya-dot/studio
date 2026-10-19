export const BOOK_IMAGE_SLOTS = ["cover", "cover2", "cover3", "banner", "setting", "card"] as const;
export type BookImageSlot = (typeof BOOK_IMAGE_SLOTS)[number];

export const CYCLE_IMAGE_SLOTS = BOOK_IMAGE_SLOTS;
export type CycleImageSlot = BookImageSlot;

export function bookImagePath(bookId: string, slot: BookImageSlot): string {
  return `/api/cabinet-image?book=${encodeURIComponent(bookId)}&slot=${slot}`;
}

export function cycleImagePath(cycleId: string, slot: CycleImageSlot): string {
  return `/api/cabinet-image?cycle=${encodeURIComponent(cycleId)}&slot=${slot}`;
}

export function userAvatarPath(userId: string): string {
  return `/api/cabinet-image?user=${encodeURIComponent(userId)}&slot=avatar`;
}

export const PORTRAIT_KINDS = ["pop-arc", "belief", "story-circle"] as const;
export type PortraitKind = (typeof PORTRAIT_KINDS)[number];

export function portraitPath(kind: PortraitKind, id: string): string {
  return `/api/cabinet-image?portrait=${kind}&id=${encodeURIComponent(id)}`;
}

export function isPortraitKind(value: string): value is PortraitKind {
  return (PORTRAIT_KINDS as readonly string[]).includes(value);
}

export function isBookImageSlot(value: string): value is BookImageSlot {
  return (BOOK_IMAGE_SLOTS as readonly string[]).includes(value);
}
