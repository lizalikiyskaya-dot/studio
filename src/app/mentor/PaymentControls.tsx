"use client";

import { useState, useTransition } from "react";
import type { PaymentStatus } from "@/generated/prisma/client";
import { updatePaymentDay, togglePaymentStatus } from "./actions";
import { BadgeButton } from "@/components/ui/Badge";

export default function PaymentControls({
  userId,
  paymentDay: initialDay,
  paymentStatus: initialStatus,
}: {
  userId: string;
  paymentDay: number | null;
  paymentStatus: PaymentStatus;
}) {
  const [day, setDay] = useState(initialDay);
  const [status, setStatus] = useState(initialStatus);
  const [, startTransition] = useTransition();

  function handleDayChange(value: string) {
    const num = value ? Number(value) : null;
    setDay(num);
    startTransition(() => updatePaymentDay(userId, num));
  }

  function handleToggle() {
    const next = status === "PAID" ? "PENDING" : "PAID";
    setStatus(next);
    startTransition(() => {
      togglePaymentStatus(userId);
    });
  }

  return (
    <div className="flex items-center gap-2 justify-end flex-wrap">
      <label className="text-[13px]" style={{ color: "var(--faded)" }}>
        День оплаты:
      </label>
      <select
        value={day ?? ""}
        onChange={(e) => handleDayChange(e.target.value)}
        className="text-[12.5px] px-1.5 py-1 rounded-sm"
        style={{ border: "1px solid var(--rule)" }}
      >
        <option value="">—</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <BadgeButton onClick={handleToggle} tone={status === "PAID" ? "success" : "danger"} fill={status === "PAID" ? "solid" : "outline"}>
        {status === "PAID" ? "оплачено" : "ожидает оплаты"}
      </BadgeButton>
    </div>
  );
}
