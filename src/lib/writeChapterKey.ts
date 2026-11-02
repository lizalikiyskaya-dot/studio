export type WriteChapter = {
  id: string;
  bookId: string;
  title: string;
};

export function manuscriptLastKey(bookId: string) {
  return `manuscript-last:${bookId}`;
}
