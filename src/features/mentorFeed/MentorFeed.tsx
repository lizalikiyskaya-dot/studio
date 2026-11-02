"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { markFeedSeen } from "./actions";
import { filterFeed, openLabel, type FeedItem, type FeedKind } from "@/lib/mentorFeed";

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

function FeedRows({ items, onOpen }: { items: FeedView[]; onOpen: (item: FeedView) => void }) {
  if (items.length === 0) {
    return <p className="feed-empty">Свежих событий нет.</p>;
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
              {item.seen ? null : (
                <button type="button" className="feed-quiet" onClick={() => onOpen({ ...item, href: "" })}>
                  Прочитано
                </button>
              )}
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
  const students = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) map.set(item.studentId, item.student);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "ru"));
  }, [items]);
  const visible = filterFeed(items, type, studentId);

  function mark(rows: FeedView[], href?: string) {
    const unseen = rows.filter((row) => !row.seen).map((row) => ({ kind: row.kind, sourceId: row.sourceId }));
    startTransition(async () => {
      if (unseen.length > 0) await markFeedSeen(unseen);
      if (href) window.location.href = href;
      else router.refresh();
    });
  }

  return { type, setType, studentId, setStudentId, students, visible, pending, mark };
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

export function MentorFeedPanel({ items }: { items: FeedView[] }) {
  const controls = useFeedControls(items);
  return (
    <section className="sheet p-4 feed-panel" aria-label="С последнего визита">
      <div className="feed-head">
        <h2>С последнего визита</h2>
        <button type="button" className="feed-all" disabled={controls.pending} onClick={() => controls.mark(controls.visible)}>
          Прочитать все
        </button>
      </div>
      <Filters
        type={controls.type}
        studentId={controls.studentId}
        students={controls.students}
        onType={controls.setType}
        onStudent={controls.setStudentId}
      />
      <FeedRows
        items={controls.visible}
        onOpen={(item) => controls.mark([item], item.href || undefined)}
      />
    </section>
  );
}

export function MentorBell({ items }: { items: FeedView[] }) {
  const [open, setOpen] = useState(false);
  const controls = useFeedControls(items);
  const count = items.filter((item) => !item.seen).length;
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
            <button type="button" className="feed-all" disabled={controls.pending} onClick={() => controls.mark(controls.visible)}>
              Прочитать все
            </button>
          </div>
          <Filters
            type={controls.type}
            studentId={controls.studentId}
            students={controls.students}
            onType={controls.setType}
            onStudent={controls.setStudentId}
          />
          <div className="feed-pop-body">
            <FeedRows items={controls.visible} onOpen={(item) => controls.mark([item], item.href || undefined)} />
          </div>
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
      <FeedRows items={action} onOpen={openItem} />
      {edits.length > 0 ? <div className="feed-group">Просто правки</div> : null}
      <FeedRows items={edits} onOpen={openItem} />
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
