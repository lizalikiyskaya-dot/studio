"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { CircleHelp } from "lucide-react";
import { AUTHOR_RANKS, STAR_LEGEND, STAR_POINTS, starsLabel } from "./rules";

const ROWS = [
  {
    points: STAR_POINTS.WEEKLY,
    title: "Задание недели",
    text: "Когда текст сдан. Повторная сдача той же недели звёзды не удваивает.",
  },
  {
    points: STAR_POINTS.MAIN_TASK,
    title: "Основное задание",
    text: "Статусы «сдано на проверку» и «принято». «В процессе» и «на доработке» звёзд не дают.",
  },
  {
    points: STAR_POINTS.CHAPTER,
    title: "Глава",
    text: "Статус «принята» в трекере глав. Один раз за главу. Другие статусы звёзд не дают.",
  },
  {
    points: STAR_POINTS.CONTEST,
    title: "Конкурс",
    text: "Статусы «отправлено», «ждём ответа», «принято» и «отклонено». «Не отправлено» — ноль.",
  },
  {
    points: STAR_POINTS.PUBLISHER,
    title: "Издательство",
    text: "Те же статусы, что у конкурса: «отправлено», «ждём ответа», «принято» и «отклонено».",
  },
] as const;

export default function StarsHelp() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--ink)" }}
        aria-label="Как начисляются звёзды"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <CircleHelp size={16} aria-hidden="true" />
      </button>
      {open
        ? createPortal(
            <div className="site-dialog-root">
              <button type="button" className="site-dialog-backdrop" aria-label="Закрыть" onClick={() => setOpen(false)} />
              <div
                className="site-dialog-card stars-help-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                style={{ width: "min(480px, 100%)" }}
              >
                <div className="site-dialog-title" id={titleId}>
                  За что дают звёзды
                </div>
                <p className="mt-2 text-[14px] font-normal leading-snug" style={{ color: "var(--ink2)" }}>
                  «Заработано» растит статус и не уменьшается. «На счету» можно тратить. Пока трат нет, числа равны.
                </p>
                <p className="mt-2 text-[14px] font-normal leading-snug" style={{ color: "var(--ink2)" }}>
                  Серия считается с понедельника по Москве. Неделю дают выполненное задание недели, новая ссылка
                  или файл в заданиях или рукописях, или сдача на проверку. 4 недели подряд — 3 звезды, 8 недель — 5,
                  12 недель — 8, дальше каждые 4 недели ещё 3. Каникулы отмечает наставник: такая неделя серию не рвёт.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2 text-[13px]" style={{ color: "var(--ink2)" }}>
                  {STAR_LEGEND.map((item) => (
                    <li key={item.label} className="rounded-full px-3 py-1" style={{ background: "var(--soft)" }}>
                      {item.points} — {item.label}
                    </li>
                  ))}
                </ul>
                <ul className="mt-4 flex flex-col gap-3">
                  {ROWS.map((row) => (
                    <li key={row.title} className="flex items-start gap-3">
                      <span
                        className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-2 text-[13px] font-semibold"
                        style={{ background: "var(--y)", color: "var(--ink)" }}
                      >
                        {row.points}
                      </span>
                      <span>
                        <span className="block text-[15px] font-semibold">{row.title}</span>
                        <span className="mt-0.5 block text-[14px] font-normal leading-snug" style={{ color: "var(--ink2)" }}>
                          {row.text}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 text-[15px] font-semibold">Статусы</div>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {AUTHOR_RANKS.map((rank) => (
                    <li
                      key={rank.title}
                      className="flex items-center justify-between gap-3 rounded-[14px] px-3 py-1.5"
                      style={{ background: "var(--soft)" }}
                    >
                      <span className="text-[14.5px] font-semibold">{rank.title}</span>
                      <span className="shrink-0 text-[13px]" style={{ color: "var(--ink2)" }}>
                        от {starsLabel(rank.min)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="site-dialog-actions">
                  <button type="button" className="site-dialog-primary" autoFocus onClick={() => setOpen(false)}>
                    Понятно
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
