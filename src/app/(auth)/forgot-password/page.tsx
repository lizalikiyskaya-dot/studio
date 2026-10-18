"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Не получилось отправить письмо");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="text-[22px] font-semibold mb-3">Письмо отправлено</h1>
        <p className="text-[13.5px] mb-6" style={{ color: "var(--faded)" }}>
          Если такая почта зарегистрирована на платформе, на неё пришла ссылка
          для смены пароля. Ссылка действует один час. Загляните и в папку
          «Спам» — иногда письмо оседает там.
        </p>
        <Link
          href="/login"
          className="block w-full py-2.5 rounded-full text-white text-[15px] text-center"
          style={{ background: "var(--wine)" }}
        >
          Вернуться ко входу
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[22px] font-semibold mb-2">Восстановление пароля</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--faded)" }}>
        Укажите почту, с которой вы регистрировались — пришлём ссылку для
        смены пароля.
      </p>

      <div className="mb-6">
        <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
          Почта
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-b py-1.5 text-[15px] outline-none bg-transparent"
          style={{ borderColor: "var(--rule)" }}
        />
      </div>

      {error && (
        <p className="text-[13px] mb-4" style={{ color: "var(--wine)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-full text-white text-[15px] disabled:opacity-60"
        style={{ background: "var(--wine)" }}
      >
        {loading ? "Отправляем..." : "Прислать ссылку"}
      </button>

      <p className="text-[13px] mt-5 text-center" style={{ color: "var(--faded)" }}>
        Вспомнили пароль?{" "}
        <Link href="/login" className="underline" style={{ color: "var(--wine)" }}>
          Войти
        </Link>
      </p>
    </form>
  );
}
