"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { dismissFeed, markFeedSeen } from "./actions";
import { MENTOR_FEED_POPUP, filterFeed, openLabel, type FeedItem, type FeedKind } from "@/lib/mentorFeed";

export type FeedView = FeedItem;

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

function FeedRows({
  items,
  onOpen,
  onDelete,
  empty,
}: {
  items: FeedView[];
  onOpen: (item: FeedView) => void;
  onDelete: (item: FeedView) => void;
  empty: string;
}) {
  if (items.length === 0) {
    if (!empty) return null;
    return <p className="feed-empty">{empty}</p>;
  }
  return (
    <div>
      {items.map((item) => (
        <article key={`${item.kind}:${item.sourceId}`} className={item.seen ? "feed-item is-seen" : "feed-item"}>
          <span className={item.seen ? "feed-mark is-seen" : item.needsAction ? "feed-mark is-action" : "feed-mark is-fyi"} />
          <div className="min-w-0">
            <div className="feed-who">
              {item.student}
              <span className={item.seen ? "feed-tag is-seen" : item.needsAction ? "feed-tag is-action" : "feed-tag is-fyi"}>
                {item.seen ? "просмотрено" : item.needsAction ? "разбор" : "правка"}
              </span>
            </div>
            <div className="feed-what">
              {item.label}
              {item.detail ? `. ${item.detail}` : ""}
            </div>
            <div className="feed-links">
              <button type="button" className="feed-open" onClick={() => onOpen(item)}>
                {openLabel(item.kind as FeedKind)}
              </button>
              <button type="button" className="feed-delete" onClick={() => onDelete(item)}>
                Удалить
              </button>
            </div>
          </div>
          <span className="feed-when">{ago(item.at)}</span>
        </article>
      ))}
    </div>
  );
}

function useFeedControls(items: FeedView[]) {
  const router = useRouter();
  const [type, setType] = useState<"all" | "action" | "edit">("all");
  const [studentId, setStudentId] = useState("");
  const [pending, startTransition] = useTransition();
  const [hidden, setHidden] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const live = items.filter((item) => !hidden.includes(`${item.kind}:${item.sourceId}`));
  const students = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of live) map.set(item.studentId, item.student);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "ru"));
  }, [items, hidden]);
  const visible = filterFeed(live, type, studentId);

  function remove(item: FeedView) {
    const key = `${item.kind}:${item.sourceId}`;
    setHidden((prev) => [...prev, key]);
    setNote("");
    startTransition(async () => {
      const ok = await dismissFeed([{ kind: item.kind, sourceId: item.sourceId }]);
      if (!ok) {
        setHidden((prev) => prev.filter((value) => value !== key));
        setNote("Удаление заработает, когда будет подключена колонка в таблице.");
        return;
      }
      router.refresh();
    });
  }

  function mark(rows: FeedView[], href?: string) {
    const unseen = rows.filter((row) => !row.seen).map((row) => ({ kind: row.kind, sourceId: row.sourceId }));
    startTransition(async () => {
      if (unseen.length > 0) await markFeedSeen(unseen);
      if (href) window.location.href = href;
      else router.refresh();
    });
  }

  return { type, setType, studentId, setStudentId, students, live, visible, pending, note, mark, remove };
}

function Filters({
  type,
  studentId,
  students,
  onType,
  onStudent,
}: {
  type: "all" | "action" | "edit";
  studentId: string;
  students: [string, string][];
  onType: (type: "all" | "action" | "edit") => void;
  onStudent: (id: string) => void;
}) {
  return (
    <div className="feed-filters">
      <div className="feed-seg" role="tablist" aria-label="Тип события">
        {(
          [
            ["all", "Все"],
            ["action", "Разбор"],
            ["edit", "Правки"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" className={type === id ? "is-on" : ""} onClick={() => onType(id)}>
            {label}
          </button>
        ))}
      </div>
      <select aria-label="Ученик" value={studentId} onChange={(event) => onStudent(event.target.value)}>
        <option value="">Все ученики</option>
        {students.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MentorFeedPanel({ items, showAllLink = true }: { items: FeedView[]; showAllLink?: boolean }) {
  const controls = useFeedControls(items);
  return (
    <section className="sheet p-4 feed-panel" aria-label="С последнего визита">
      <div className="feed-head">
        <h2>С последнего визита</h2>
        <button type="button" className="feed-all" disabled={controls.pending || controls.live.length === 0} onClick={() => controls.mark(controls.live)}>
          Пометить все как прочитанное
        </button>
      </div>
      {controls.note ? <p className="feed-empty">{controls.note}</p> : null}
      <Filters
        type={controls.type}
        studentId={controls.studentId}
        students={controls.students}
        onType={controls.setType}
        onStudent={controls.setStudentId}
      />
      <FeedRows
        items={controls.visible}
        empty="Свежих событий нет."
        onOpen={(item) => controls.mark([item], item.href || undefined)}
        onDelete={controls.remove}
      />
      {showAllLink ? (
        <Link href="/mentor/notifications" className="feed-more">
          Все уведомления
        </Link>
      ) : null}
    </section>
  );
}

export function MentorBell({ items }: { items: FeedView[] }) {
  const [open, setOpen] = useState(false);
  const controls = useFeedControls(items);
  const count = controls.live.filter((item) => !item.seen).length;

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
          <div className="feed-head">
            <button type="button" className="feed-all" disabled={controls.pending || controls.live.length === 0} onClick={() => controls.mark(controls.live)}>
              Пометить все как прочитанное
            </button>
            <button type="button" className="feed-close" onClick={() => setOpen(false)}>
              Закрыть
            </button>
          </div>
          {controls.note ? <p className="feed-empty">{controls.note}</p> : null}
          <Filters
            type={controls.type}
            studentId={controls.studentId}
            students={controls.students}
            onType={controls.setType}
            onStudent={controls.setStudentId}
          />
          <div className="feed-pop-body">
            <FeedRows
              items={controls.visible.slice(0, MENTOR_FEED_POPUP)}
              empty="Свежих событий нет."
              onOpen={(item) => controls.mark([item], item.href || undefined)}
              onDelete={controls.remove}
            />
          </div>
          <Link href="/mentor/notifications" className="feed-more" onClick={() => setOpen(false)}>
            Все уведомления
          </Link>
        </div>
      ) : null}
    </div>
  );
}

const DAY_KEY = "mentor-feed-day";

function moscowDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function MentorDayCard({ items }: { items: FeedView[] }) {
  const unseen = items.filter((item) => !item.seen);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const action = unseen.filter((item) => item.needsAction);
  const edits = unseen.filter((item) => !item.needsAction);

  useEffect(() => {
    if (unseen.length === 0) return;
    if (window.localStorage.getItem(DAY_KEY) === moscowDay()) return;
    setOpen(true);
  }, [unseen.length]);

  if (!open) return null;

  function later() {
    window.localStorage.setItem(DAY_KEY, moscowDay());
    setOpen(false);
  }

  function readAll() {
    startTransition(async () => {
      await markFeedSeen(unseen.map((item) => ({ kind: item.kind, sourceId: item.sourceId })));
      window.localStorage.setItem(DAY_KEY, moscowDay());
      setOpen(false);
      router.refresh();
    });
  }

  function hide(item: FeedView) {
    startTransition(async () => {
      await dismissFeed([{ kind: item.kind, sourceId: item.sourceId }]);
      router.refresh();
    });
  }

  function openItem(item: FeedView) {
    startTransition(async () => {
      await markFeedSeen([{ kind: item.kind, sourceId: item.sourceId }]);
      window.localStorage.setItem(DAY_KEY, moscowDay());
      window.location.href = item.href;
    });
  }

  return (
    <section className="feed-day" aria-label="Первый заход за день">
      <div className="feed-kicker">Первый заход за день</div>
      <h2>Пока Вас не было</h2>
      <p>
        Сдач на разбор: {action.length}. Правок без сдачи: {edits.length}. Ссылка открывает это место и подсвечивает изменение.
      </p>
      {action.length > 0 ? <div className="feed-group">Нужен разбор</div> : null}
      <FeedRows items={action} empty="" onOpen={openItem} onDelete={hide} />
      {edits.length > 0 ? <div className="feed-group">Просто правки</div> : null}
      <FeedRows items={edits} empty="" onOpen={openItem} onDelete={hide} />
      <div className="feed-day-actions">
        <button type="button" className="feed-quiet" onClick={later}>
          Оставить на потом
        </button>
        <button type="button" className="feed-pill" disabled={pending} onClick={readAll}>
          Прочитать все
        </button>
      </div>
    </section>
  );
}
