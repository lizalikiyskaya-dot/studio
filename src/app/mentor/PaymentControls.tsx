"use client";

import { useState, useTransition } from "react";
import { updatePaymentDay } from "./actions";

// Payment status (оплачено / ожидает оплаты) is controlled by the access
// badge in StudentsList; here we only pick the monthly payment day.
export default function PaymentControls({
  userId,
  paymentDay: initialDay,
}: {
  userId: string;
  paymentDay: number | null;
}) {
  const [day, setDay] = useState(initialDay);
  const [, startTransition] = useTransition();

  function handleDayChange(value: string) {
    const num = value ? Number(value) : null;
    setDay(num);
    startTransition(() => updatePaymentDay(userId, num));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
    </div>
  );
}
