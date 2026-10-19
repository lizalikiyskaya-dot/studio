import type { ReactNode } from "react";
import { markedTitle } from "@/components/markedTitle";

export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="min-w-0">
        <h1 className="page-title">{markedTitle(title)}</h1>
        {description ? <p className="page-lead">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}
