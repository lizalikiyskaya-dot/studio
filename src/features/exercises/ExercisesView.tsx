import Subtabs from "@/components/Subtabs";
import PopArcsView from "./popArcs/PopArcsView";
import BeliefView from "./belief/BeliefView";
import CustomExercisesView from "./custom/CustomExercisesView";
import AdditionalView from "./additional/AdditionalView";

export default function ExercisesView({
  studentId,
  isMentorViewer,
}: {
  studentId: string;
  isMentorViewer: boolean;
}) {
  return (
    <div>
      <h1 className="page-title text-[24px] font-semibold mb-6">Упражнения</h1>
      <Subtabs
        tabs={[
          {
            label: "Арки из поп-культуры",
            content: <PopArcsView studentId={studentId} isMentorViewer={isMentorViewer} />,
          },
          {
            label: "Начало / конец пути героя",
            content: <BeliefView studentId={studentId} isMentorViewer={isMentorViewer} />,
          },
          {
            label: "Творческие упражнения",
            content: <CustomExercisesView studentId={studentId} isMentorViewer={isMentorViewer} />,
          },
          {
            label: "Дополнительно",
            content: <AdditionalView studentId={studentId} isMentorViewer={isMentorViewer} />,
          },
        ]}
      />
    </div>
  );
}
