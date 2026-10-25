import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <div className="route-slot route-slot-auth">{children}</div>;
}
