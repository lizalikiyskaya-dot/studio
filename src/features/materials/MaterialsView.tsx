import { prisma } from "@/lib/prisma";
import { loadCabinetGuides } from "@/lib/guides";
import MaterialsList from "./MaterialsList";

export default async function MaterialsView({
  studentId,
  canManage,
  initialTab = 0,
}: {
  studentId: string;
  canManage: boolean;
  initialTab?: number;
}) {
  const [materials, guides] = await Promise.all([
    prisma.material.findMany({
      where: { studentId },
      orderBy: { order: "asc" },
    }),
    loadCabinetGuides(studentId, canManage),
  ]);

  return (
    <div>
      <h1 className="page-title text-[24px] font-semibold mb-2">Материалы</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--faded)" }}>
        Статус кликабелен: не прочитано → в процессе → прочитано.
      </p>
      <MaterialsList
        studentId={studentId}
        initialMaterials={materials}
        guides={guides}
        canManage={canManage}
        initialTab={initialTab}
      />
    </div>
  );
}
