import { prisma } from "@/lib/prisma";
import MaterialsList from "./MaterialsList";

export default async function MaterialsView({
  studentId,
  canManage,
}: {
  studentId: string;
  canManage: boolean;
}) {
  const materials = await prisma.material.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="page-title text-[24px] font-semibold mb-2">Материалы</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--faded)" }}>
        Статус кликабелен: не прочитано → в процессе → прочитано.
      </p>
      <MaterialsList studentId={studentId} initialMaterials={materials} canManage={canManage} />
    </div>
  );
}
