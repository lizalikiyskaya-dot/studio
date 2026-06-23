import type { MaterialStatus } from "@/generated/prisma/client";

const STATUS_CYCLE: MaterialStatus[] = ["UNREAD", "IN_PROGRESS", "READ"];

export function nextMaterialStatus(status: MaterialStatus): MaterialStatus {
  const i = STATUS_CYCLE.indexOf(status);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

export const MATERIAL_STATUS_LABEL: Record<MaterialStatus, string> = {
  UNREAD: "не прочитано",
  IN_PROGRESS: "в процессе",
  READ: "прочитано",
};

export const MATERIAL_STATUS_STYLE: Record<MaterialStatus, React.CSSProperties> = {
  UNREAD: { background: "#fff", color: "var(--faded)", border: "1px dashed var(--rule)" },
  IN_PROGRESS: { background: "#fff", color: "var(--sage)", border: "1px solid var(--sage)" },
  READ: { background: "var(--ink)", color: "#fff", border: "1px solid var(--ink)" },
};
