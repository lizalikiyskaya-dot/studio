"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markStudentSeen } from "./actions";
import { filterStudentFeed, openStudentLabel, type StudentFeedItem } from "@/lib/studentFeed";

function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  if (days === 1) return "вчера";
  return `${days} дн назад`;
}

export function StudentBell({ items }: { items: StudentFeedItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"all" | "tasks" | "edits">("all");
  const [pending, startTransition] = useTransition();
  const visible = filterStudentFeed(items, type);
  const count = items.filter((item) => !item.seen).length;

  function mark(rows: StudentFeedItem[], href?: string) {
    const unseen = rows.filter((row) => !row.seen).map((row) => ({ kind: row.kind, sourceId: row.sourceId }));
    startTransition(async () => {
      if (unseen.length > 0) await markStudentSeen(unseen);
      if (href) window.location.href = href;
      else router.refresh();
    });
  }

  return (
    <div className="feed-bell-wrap">
      <button
        type="button"
        className={open ? "feed-bell is-open" : "feed-bell"}
        aria-expanded={open}
        aria-label={count > 0 ? `Уведомления, ${count} новых` : "Уведомления"}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {count > 0 ? <span className="feed-bell-count">{count}</span> : null}
      </button>
      {open ? (
        <div className="feed-pop" role="dialog" aria-label="Уведомления">
          <div className="feed-head">
            <div className="feed-kicker">Не открыто · {count}</div>
            <button type="button" className="feed-all" disabled={pending} onClick={() => mark(visible)}>
              Прочитать все
            </button>
          </div>
          <div className="feed-filters">
            <div className="feed-seg" role="tablist" aria-label="Тип события">
              {(
                [
                  ["all", "Все"],
                  ["tasks", "Задания"],
                  ["edits", "Правки"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" className={type === id ? "is-on" : ""} onClick={() => setType(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="feed-pop-body">
            {visible.length === 0 ? (
              <p className="feed-empty">Свежих событий нет.</p>
            ) : (
              visible.map((item) => (
                <article key={`${item.kind}:${item.sourceId}`} className={item.seen ? "feed-item is-seen" : "feed-item"}>
                  <span className={item.seen ? "feed-mark is-seen" : item.needsAction ? "feed-mark is-action" : "feed-mark is-fyi"} />
                  <div className="min-w-0">
                    <div className="feed-who">
                      {item.label}
                      <span className={item.seen ? "feed-tag is-seen" : item.needsAction ? "feed-tag is-action" : "feed-tag is-fyi"}>
                        {item.seen ? "просмотрено" : item.needsAction ? "задание" : "правка"}
                      </span>
                    </div>
                    <div className="feed-what">{item.detail}</div>
                    <div className="feed-links">
                      <button type="button" className="feed-open" onClick={() => mark([item], item.href)}>
                        {openStudentLabel(item.kind)}
                      </button>
                      {item.seen ? null : (
                        <button type="button" className="feed-quiet" onClick={() => mark([item])}>
                          Прочитано
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="feed-when">{ago(item.at)}</span>
                </article>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
