import { prisma } from "@/lib/prisma";
import MaterialsList from "./MaterialsList";
import PageHeader from "@/components/PageHeader";

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
      <PageHeader
        title="Материалы"
        description="Книги и методички от Лизы. Отмечайте, что уже прочитано."
      />
      <MaterialsList studentId={studentId} initialMaterials={materials} canManage={canManage} />
    </div>
  );
}