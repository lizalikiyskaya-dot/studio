"use client";

import { useState, useTransition } from "react";
import { updatePaymentSettings } from "./actions";

// Поля — те же .fld, что на входе. Тумблер жёлтый, как кнопка «Закладки»:
// общий ToggleSwitch в остальных местах пока зелёный, сюда он не подходит.
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

  function handleReminders() {
    const next = !reminders;
    setReminders(next);
    save({ day, amount, reminders: next });
  }

  return (
    <div className="mentor-pay">
      <div className="mentor-pay-fields">
        <select
          value={day ?? ""}
          onChange={(e) => handleDayChange(e.target.value)}
          aria-label="День оплаты"
          className="fld"
        >
          <option value="">—</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <label className="mentor-pay-amount">
          <span className="sr-only">Сумма оплаты, рубли</span>
          <input
            inputMode="numeric"
            aria-label="Сумма оплаты, рубли"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={() => save({ day, amount, reminders })}
            className="fld"
          />
          <span className="mentor-pay-rub" aria-hidden="true">₽</span>
        </label>
      </div>
      <button
        type="button"
        className="mentor-pay-letter"
        aria-pressed={reminders}
        onClick={handleReminders}
      >
        <span className="mentor-pay-track">
          <span className="mentor-pay-knob" />
        </span>
        <span className="mentor-pay-letter-label">Письмо в день оплаты</span>
      </button>
    </div>
  );
}
