"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Не получилось сменить пароль");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div>
        <h1 className="auth-title">Пароль изменён</h1>
        <p className="auth-sub">Теперь войдите с новым паролем.</p>
        <Link href="/login" className="btn-y mt-6">Войти</Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="auth-title">Новый пароль</h1>
      <p className="auth-sub">Придумайте пароль не короче 8 символов.</p>

      <label className="fld-label">
        Новый пароль
        <PasswordInput value={password} onChange={setPassword} required minLength={8} />
      </label>
      <label className="fld-label">
        Повторите пароль
        <PasswordInput value={confirm} onChange={setConfirm} required minLength={8} />
      </label>

      {error && (
        <div className="form-error flex items-center gap-2">
          <CircleAlert size={16} />
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-y mt-5">
        {loading ? "Сохраняем..." : "Сохранить пароль"}
      </button>
    </form>
  );
}
