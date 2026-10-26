"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { markedTitle } from "@/components/markedTitle";

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
        <h1 className="auth-title">{markedTitle("Письмо отправлено")}</h1>
        <p className="auth-sub">
          Если такая почта зарегистрирована на платформе, на неё пришла ссылка
          для смены пароля. Ссылка действует один час. Загляните и в папку
          «Спам» — иногда письмо оседает там.
        </p>
        <Link href="/login" className="btn-y mt-6">Вернуться ко входу</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="auth-title">{markedTitle("Восстановление пароля")}</h1>
      <p className="auth-sub">Укажите почту, с которой Вы регистрировались — пришлём ссылку для смены пароля.</p>

      <label className="fld-label">
        Почта
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="fld" autoComplete="email" />
      </label>

      {error && (
        <div className="form-error flex items-center gap-2">
          <CircleAlert size={16} />
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-y mt-5">
        {loading ? "Отправляем..." : "Прислать ссылку"}
      </button>

      <p className="text-[14px] mt-6 text-center" style={{ color: "var(--ink2)" }}>
        Вспомнили пароль? <Link href="/login" className="lnk">Войти</Link>
      </p>
    </form>
  );
}
