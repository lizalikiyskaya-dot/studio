"use client";

import { Button } from "@/components/ui/Button";
import TaskStatusMenu from "@/features/tasks/TaskStatusMenu";
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
  const canSubmit = !isMentor && status !== "SUBMITTED" && status !== "ACCEPTED";
  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
      <TaskStatusMenu status={status} onChange={onChange} locked={!isMentor} />
      {canSubmit ? (
        <Button type="button" size="sm" onClick={() => onChange("SUBMITTED")}>
          Сдать на проверку
        </Button>
      ) : null}
    </div>
  );
}
