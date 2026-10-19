import { prisma } from "@/lib/prisma";
import { loadCabinetGuides } from "@/lib/guides";
import MaterialsList from "./MaterialsList";
import PageHeader from "@/components/PageHeader";

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
      orderBy: [{ order: "asc" }, { id: "asc" }],
    }),
    loadCabinetGuides(studentId, canManage),
  ]);

  return (
    <div>
      <PageHeader
        title="Материалы"
      />
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