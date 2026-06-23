import { prisma } from "@/lib/prisma";
import MaterialsList from "./MaterialsList";

export default async function MaterialsView({ studentId }: { studentId: string }) {
  const materials = await prisma.material.findMany({
    where: { studentId },
    orderBy: { order: "asc" },
  });

  return (
    <div>
      <h1 className="text-[24px] font-semibold mb-2">Материалы</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--faded)" }}>
        Статус кликабелен: не прочитано → в процессе → прочитано.
      </p>
      <MaterialsList studentId={studentId} initialMaterials={materials} />
    </div>
  );
}
