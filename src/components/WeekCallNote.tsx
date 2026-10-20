import type { ReactNode } from "react";

export default function WeekCallNote({
  title,
  deadline,
  actions,
}: {
  title: string;
  deadline: string;
  note: string;
  untilLabel: string;
  actions?: ReactNode;
}) {
  return (
    <div className="banner-call">
      <span className="deadline-ribbon" aria-hidden="true" />
      <p className="banner-call-label">Опен-колл недели</p>
      <p className="banner-call-title">
        {title} — приём до {deadline}
      </p>
      {actions ? <div className="banner-call-actions">{actions}</div> : null}
    </div>
  );
}
