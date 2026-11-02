"use client";

import { Button } from "@/components/ui/Button";
import { flySubmitStar } from "./submitStar";

/** Жёлтая «Сдать на проверку». После нажатия сразу выглядит сданной и не жмётся. */
export default function SubmitForReviewButton({
  submitted,
  onSubmit,
  fly = true,
}: {
  submitted: boolean;
  onSubmit: () => void;
  /** У основных заданий полёт выключен: сдача звёзд не даёт. */
  fly?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      disabled={submitted}
      aria-disabled={submitted}
      onClick={(event) => {
        if (submitted) return;
        if (fly) flySubmitStar(event.currentTarget);
        onSubmit();
      }}
      style={
        submitted
          ? { background: "var(--soft)", color: "var(--ink2)", border: "1px solid var(--border)", cursor: "default" }
          : undefined
      }
    >
      {submitted ? "Сдано на проверку" : "Сдать на проверку"}
    </Button>
  );
}
