import BadgeGallery from "@/features/badges/BadgeGallery";
import { loadBadges } from "@/features/badges/load";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const data = await loadBadges(studentId);
  return <BadgeGallery studentId={studentId} data={data} play={false} canManage />;
}
