import type { ReactNode } from "react";

/** Жёлтый маркер: цитата входа, имя в приветствии, ключевое слово крупного заголовка, статус «Принято». */
export default function Mark({ children }: { children: ReactNode }) {
  return <span className="mk">{children}</span>;
}
