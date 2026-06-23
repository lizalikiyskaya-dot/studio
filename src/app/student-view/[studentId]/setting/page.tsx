import SettingView from "@/features/setting/SettingView";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ book?: string }>;
}) {
  const { studentId } = await params;
  const { book } = await searchParams;
  return (
    <SettingView
      studentId={studentId}
      basePath={`/student-view/${studentId}`}
      requestedBookId={book}
    />
  );
}
