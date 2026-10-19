"use client";

import { useState, useTransition } from "react";
import { updatePaymentSettings } from "./actions";
import ToggleSwitch from "@/components/ToggleSwitch";

// День месяца уже был. Здесь же необязательная сумма и выключатель письма.
// Статус «оплачено / ожидает» по-прежнему переключается бейджем доступа.
export default function PaymentControls({
  userId,
  paymentDay: initialDay,
  paymentAmount: initialAmount,
  paymentReminders: initialReminders,
}: {
  userId: string;
  paymentDay: number | null;
  paymentAmount: number | null;
  paymentReminders: boolean;
}) {
  const [day, setDay] = useState(initialDay);
  const [amount, setAmount] = useState(initialAmount == null ? "" : String(initialAmount));
  const [reminders, setReminders] = useState(initialReminders);
  const [, startTransition] = useTransition();

  function save(next: { day: number | null; amount: string; reminders: boolean }) {
    const parsedAmount = next.amount.trim() === "" ? null : Number(next.amount);
    if (parsedAmount != null && !Number.isInteger(parsedAmount)) return;
    startTransition(() =>
      updatePaymentSettings(userId, {
        paymentDay: next.day,
        paymentAmount: parsedAmount,
        paymentReminders: next.reminders,
      })
    );
  }

  function handleDayChange(value: string) {
    const num = value ? Number(value) : null;
    setDay(num);
    save({ day: num, amount, reminders });
  }

  function handleAmountBlur() {
    save({ day, amount, reminders });
  }

  function handleReminders(checked: boolean) {
    setReminders(checked);
    save({ day, amount, reminders: checked });
  }

  return (
    <div className="mentor-pay flex flex-col items-start gap-1">
      <select
        value={day ?? ""}
        onChange={(e) => handleDayChange(e.target.value)}
        aria-label="День оплаты"
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
      <input
        inputMode="numeric"
        aria-label="Сумма оплаты, рубли"
        placeholder="сумма"
        value={amount}
        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={handleAmountBlur}
        className="text-[12.5px] px-1.5 py-1 rounded-sm"
        style={{ border: "1px solid var(--rule)", width: 72 }}
      />
      <ToggleSwitch checked={reminders} onChange={handleReminders} label="письмо" />
    </div>
  );
}
