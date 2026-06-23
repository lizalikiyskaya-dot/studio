"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
      <h1 className="text-[22px] font-semibold mb-6">Вход</h1>

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
        {loading ? "Вход..." : "Войти"}
      </button>

      <p className="text-[13px] mt-5 text-center" style={{ color: "var(--faded)" }}>
        Ещё нет аккаунта?{" "}
        <Link href="/register" className="underline" style={{ color: "var(--wine)" }}>
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
