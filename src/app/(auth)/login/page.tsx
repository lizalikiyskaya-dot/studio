"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Ошибка входа");
      return;
    }

    if (data.status === "APPROVED") {
      router.push("/dashboard/tasks");
    } else {
      router.push("/pending");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="seg">
        <Link href="/login" className="on">Вход</Link>
        <Link href="/register">Регистрация</Link>
      </div>
      <h1 className="auth-title">С возвращением</h1>
      <p className="auth-sub">Войдите, чтобы продолжить работу над текстом.</p>

      <label className="fld-label">
        Почта
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="fld"
          autoComplete="email"
        />
      </label>

      <label className="fld-label">
        Пароль
        <PasswordInput value={password} onChange={setPassword} required />
      </label>

      <p className="mt-3 text-[13.5px]">
        <Link href="/forgot-password" className="lnk">Забыли пароль?</Link>
      </p>

      {error && (
        <div className="form-error flex items-center gap-2">
          <CircleAlert size={16} />
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-y mt-5">
        {loading ? "Вход..." : "Войти"}
      </button>

      <p className="text-[14px] mt-6 text-center" style={{ color: "var(--ink2)" }}>
        Нет аккаунта? <Link href="/register" className="lnk">Зарегистрироваться</Link>
      </p>
    </form>
  );
}
