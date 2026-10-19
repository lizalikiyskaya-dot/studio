import type { ReactNode } from "react";

/** Жёлтый маркер. Пока только на цитате входа — на остальные экраны не вешать, пока не выберут место. */
export default function Mark({ children }: { children: ReactNode }) {
  return <span className="mk">{children}</span>;
}
