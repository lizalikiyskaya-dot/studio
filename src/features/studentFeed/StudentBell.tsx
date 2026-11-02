"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { dismissStudentSeen, markStudentSeen } from "./actions";
import { STUDENT_FEED_POPUP, filterStudentFeed, openStudentLabel, type StudentFeedItem } from "@/lib/studentFeed";

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

function itemKey(item: StudentFeedItem): string {
  return `${item.kind}:${item.sourceId}`;
}

export function StudentFeedList({
  items,
  mode,
  onClose,
}: {
  items: StudentFeedItem[];
  mode: "pop" | "page";
  onClose?: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<"all" | "tasks" | "edits">("all");
  const [hidden, setHidden] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const live = items.filter((item) => !hidden.includes(itemKey(item)));
  const visible = filterStudentFeed(live, type);
  const shown = mode === "pop" ? visible.slice(0, STUDENT_FEED_POPUP) : visible;

  function mark(rows: StudentFeedItem[], href?: string) {
    const unseen = rows.filter((row) => !row.seen).map((row) => ({ kind: row.kind, sourceId: row.sourceId }));
    startTransition(async () => {
      if (unseen.length > 0) await markStudentSeen(unseen);
      if (href) window.location.href = href;
      else router.refresh();
    });
  }

  function remove(item: StudentFeedItem) {
    const key = itemKey(item);
    setHidden((prev) => [...prev, key]);
    setNote("");
    startTransition(async () => {
      const ok = await dismissStudentSeen([{ kind: item.kind, sourceId: item.sourceId }]);
      if (!ok) {
        setHidden((prev) => prev.filter((value) => value !== key));
        setNote("Удаление заработает, когда будет подключена колонка в таблице.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="feed-head">
        <button type="button" className="feed-all" disabled={pending || live.length === 0} onClick={() => mark(live)}>
          Пометить все как прочитанное
        </button>
        {mode === "pop" ? (
          <button type="button" className="feed-close" onClick={onClose}>
            Закрыть
          </button>
        ) : null}
      </div>
      {note ? <p className="feed-empty">{note}</p> : null}
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
        {shown.length === 0 ? (
          <p className="feed-empty">{mode === "page" ? "Уведомлений нет." : "Свежих событий нет."}</p>
        ) : (
          shown.map((item) => (
            <article key={itemKey(item)} className={item.seen ? "feed-item is-seen" : "feed-item"}>
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
                  <button type="button" className="feed-delete" onClick={() => remove(item)}>
                    Удалить
                  </button>
                </div>
              </div>
              <span className="feed-when">{ago(item.at)}</span>
            </article>
          ))
        )}
      </div>
      {mode === "pop" ? (
        <Link href="/dashboard/notifications" className="feed-more" onClick={onClose}>
          Все уведомления
        </Link>
      ) : null}
    </div>
  );
}

export function StudentBell({ items }: { items: StudentFeedItem[] }) {
  const [open, setOpen] = useState(false);
  const count = items.filter((item) => !item.seen).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
          <StudentFeedList items={items} mode="pop" onClose={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
