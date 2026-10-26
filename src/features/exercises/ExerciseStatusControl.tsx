"use client";

import TaskStatusMenu from "@/features/tasks/TaskStatusMenu";
import SubmitForReviewButton from "@/features/submit/SubmitForReviewButton";
import { submitReviewControl } from "@/features/submit/submitStar";
import type { TaskStatus } from "@/generated/prisma/client";

/** Чип статуса как у заданий. Ученик сдаёт кнопкой, наставник выбирает статус в меню. */
export default function ExerciseStatusControl({
  status,
  isMentor,
  onChange,
}: {
  status: TaskStatus;
  isMentor: boolean;
  onChange: (status: TaskStatus) => void;
}) {
  const submit = !isMentor ? submitReviewControl(status) : "hidden";
  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <TaskStatusMenu status={status} onChange={onChange} locked={!isMentor} />
      {submit === "hidden" ? null : (
        <SubmitForReviewButton submitted={submit === "submitted"} onSubmit={() => onChange("SUBMITTED")} />
      )}
    </div>
  );
}
