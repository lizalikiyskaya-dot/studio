"use client";

import { Button } from "@/components/ui/Button";
import { flySubmitStar } from "./submitStar";

/** Жёлтая «Сдать на проверку». После нажатия сразу выглядит сданной и не жмётся. */
export default function SubmitForReviewButton({
  submitted,
  onSubmit,
}: {
  submitted: boolean;
  onSubmit: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      disabled={submitted}
      aria-disabled={submitted}
      onClick={(event) => {
        if (submitted) return;
        flySubmitStar(event.currentTarget);
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
