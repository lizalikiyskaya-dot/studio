import Subtabs from "@/components/Subtabs";
import PopArcsView from "./popArcs/PopArcsView";
import BeliefView from "./belief/BeliefView";
import CustomExercisesView from "./custom/CustomExercisesView";
import FreeFormatView from "./free/FreeFormatView";

export default function ExercisesView({ studentId }: { studentId: string }) {
  return (
    <div>
      <h1 className="text-[24px] font-semibold mb-6">Упражнения</h1>
      <Subtabs
        tabs={[
          { label: "Арки из поп-культуры", content: <PopArcsView studentId={studentId} /> },
          { label: "Начало / конец пути героя", content: <BeliefView studentId={studentId} /> },
          { label: "Творческие упражнения", content: <CustomExercisesView studentId={studentId} /> },
          { label: "Свой формат", content: <FreeFormatView studentId={studentId} /> },
        ]}
      />
    </div>
  );
}
