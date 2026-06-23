"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
        <label className="block font-mono-label text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
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
        <label className="block font-mono-label text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
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

      <div className="mb-6">
        <label className="block font-mono-label text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--faded)" }}>
          Пароль
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        className="w-full py-2.5 rounded-[2px] text-white font-mono-label text-[12px] tracking-wide uppercase disabled:opacity-60"
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
