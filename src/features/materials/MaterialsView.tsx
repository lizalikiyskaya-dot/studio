import { loadCabinetGuides } from "@/lib/guides";
import { starAccount } from "@/features/stars/award";
import { loadStudentMaterials } from "./loadMaterials";
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
  const [materials, guides, stars] = await Promise.all([
    loadStudentMaterials(studentId),
    loadCabinetGuides(studentId, true),
    starAccount(studentId),
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
        starBalance={stars.balance}
        initialTab={initialTab}
      />
    </div>
  );
}