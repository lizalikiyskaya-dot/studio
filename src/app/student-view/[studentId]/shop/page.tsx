import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  redirect(`/student-view/${studentId}/materials?tab=handouts`);
}
