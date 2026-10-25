import PageHeader from "@/components/PageHeader";
import AdditionalView from "./additional/AdditionalView";
import GraphView from "./graph/GraphView";

export default function ExercisesView({
  studentId,
  isMentorViewer,
}: {
  studentId: string;
  isMentorViewer: boolean;
}) {
  return (
    <div>
      <PageHeader
        title="Упражнения"
        description="Жёлтая точка — ход уже написан. Все ходы на этой странице, их можно править сразу."
      />
      <GraphView studentId={studentId} isMentorViewer={isMentorViewer} />
      <h2 className="heading mb-3 mt-8 text-[20px]">Дополнительно</h2>
      <AdditionalView studentId={studentId} isMentorViewer={isMentorViewer} />
    </div>
  );
}
