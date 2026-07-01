"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

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
      <h1 className="text-[22px] font-semibold mb-2">Регистрация</h1>
      <p className="text-[13px] mb-6" style={{ color: "var(--faded)" }}>
        После регистрации заявку нужно подтвердить — доступ откроется после
        одобрения наставником.
      </p>

      <div className="mb-4">
        <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
          Имя
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border-b py-1.5 text-[15px] outline-none bg-transparent"
          style={{ borderColor: "var(--rule)" }}
        />
      </div>

      <div className="mb-4">
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

      <div className="mb-4">
        <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
          Пароль
        </label>
        <PasswordInput value={password} onChange={setPassword} required minLength={8} />
      </div>

      <div className="mb-6">
        <label className="block text-[13px] mb-1.5" style={{ color: "var(--faded)" }}>
          Повторите пароль
        </label>
        <PasswordInput value={passwordConfirm} onChange={setPasswordConfirm} required minLength={8} />
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
        {loading ? "Отправка..." : "Зарегистрироваться"}
      </button>

      <p className="text-[13px] mt-5 text-center" style={{ color: "var(--faded)" }}>
        Уже есть аккаунт?{" "}
        <Link href="/login" className="underline" style={{ color: "var(--wine)" }}>
          Войти
        </Link>
      </p>
    </form>
  );
}
