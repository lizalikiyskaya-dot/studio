import type { ReactNode } from "react";

export default function Collapse({
  open,
  children,
  className = "",
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={open ? "collapse-slot is-open" : "collapse-slot"}>
      <div className="collapse-inner" inert={open ? undefined : true}>
        {className ? <div className={className}>{children}</div> : children}
      </div>
    </div>
  );
}
