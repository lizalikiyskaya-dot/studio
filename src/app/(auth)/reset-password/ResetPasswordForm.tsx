"use client";

import { useState } from "react";
import Link from "next/link";
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
        <h1 className="text-[22px] font-semibold mb-3">Пароль изменён</h1>
        <p className="text-[13.5px] mb-6" style={{ color: "var(--faded)" }}>
          Теперь войдите с новым паролем.
        </p>
        <Link
          href="/login"
          className="block w-full py-2.5 rounded-full text-white text-[15px] text-center"
          style={{ background: "var(--wine)" }}
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-[22px] font-semibold mb-2">Новый пароль</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--faded)" }}>
        Придумайте пароль не короче 8 символов.
      </p>

      <div className="mb-4">
        <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
          Новый пароль
        </label>
        <PasswordInput value={password} onChange={setPassword} required minLength={8} />
      </div>

      <div className="mb-6">
        <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
          Повторите пароль
        </label>
        <PasswordInput value={confirm} onChange={setConfirm} required minLength={8} />
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
        {loading ? "Сохраняем..." : "Сохранить пароль"}
      </button>
    </form>
  );
}
