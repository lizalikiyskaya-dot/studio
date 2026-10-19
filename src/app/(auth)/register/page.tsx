"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import { markedTitle } from "@/components/markedTitle";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Ошибка регистрации");
      return;
    }

    router.push("/pending");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="seg">
        <Link href="/login">Вход</Link>
        <Link href="/register" className="on">Регистрация</Link>
      </div>
      <h1 className="auth-title">{markedTitle("Заявка в студию")}</h1>
      <p className="auth-sub">После регистрации заявку нужно подтвердить — доступ откроется после одобрения наставником.</p>

      <label className="fld-label">
        Имя
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="fld" />
      </label>
      <label className="fld-label">
        Почта
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="fld" autoComplete="email" />
      </label>
      <label className="fld-label">
        Пароль
        <PasswordInput value={password} onChange={setPassword} required minLength={8} />
      </label>
      <label className="fld-label">
        Повторите пароль
        <PasswordInput value={passwordConfirm} onChange={setPasswordConfirm} required minLength={8} />
      </label>

      {error && (
        <div className="form-error flex items-center gap-2">
          <CircleAlert size={16} />
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-y mt-5">
        {loading ? "Отправка..." : "Зарегистрироваться"}
      </button>

      <p className="text-[14px] mt-6 text-center" style={{ color: "var(--ink2)" }}>
        Уже есть аккаунт? <Link href="/login" className="lnk">Войти</Link>
      </p>
    </form>
  );
}
